import { getDriveClient } from "./oauth";
import { getPrisma } from "@/lib/db";
import { embedTexts } from "@/lib/vector/embeddings";
import { Readable } from "stream";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

const CHUNK_SIZE_CHARS = 3500;
const CHUNK_OVERLAP_CHARS = 400;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB strict limit
const EMBED_BATCH_SIZE = 10; // smaller batches to reduce peak memory
const HEAP_LIMIT_BYTES = 6 * 1024 * 1024 * 1024; // 6GB safety threshold (for 8GB RAM machines)

const SUPPORTED_MIMES = new Set([
    "application/vnd.google-apps.document",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/csv",
]);

const EXPORT_MIMES: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
};

/* Binary formats that need a dedicated parser */
const BINARY_MIMES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type IngestResult = {
    processed: number;
    failed: number;
    errors: string[];
};

/* =========================================================
   CHUNKING
========================================================= */
export function chunkText(text: string): string[] {
    const chunks: string[] = [];
    const trimmed = text.trim();
    if (!trimmed) return [];

    let start = 0;

    while (start < trimmed.length) {
        const end = Math.min(start + CHUNK_SIZE_CHARS, trimmed.length);
        let slice = trimmed.slice(start, end);

        if (end < trimmed.length) {
            const lastSpace = slice.lastIndexOf(" ");
            if (lastSpace > CHUNK_SIZE_CHARS / 2) {
                slice = slice.slice(0, lastSpace + 1);
            }
        }

        chunks.push(slice);

        if (end >= trimmed.length) break;

        start += slice.length - CHUNK_OVERLAP_CHARS;
    }

    return chunks;
}

/* =========================================================
   STREAMING HELPERS (size-limited)
========================================================= */

/** Stream → Buffer (for binary formats like PDF/DOCX) */
async function streamToBuffer(
    stream: Readable,
    maxBytes: number
): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    for await (const chunk of stream) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buf.length;
        if (totalBytes > maxBytes) {
            stream.destroy();
            throw new Error(
                `File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit during download (got ${totalBytes} bytes so far)`
            );
        }
        chunks.push(buf);
    }

    return Buffer.concat(chunks);
}

/** Stream → String (for text formats) */
async function streamToString(
    stream: Readable,
    maxBytes: number
): Promise<string> {
    const buf = await streamToBuffer(stream, maxBytes);
    return buf.toString("utf8");
}

/* =========================================================
   FILE TEXT EXTRACTION (format-aware)
========================================================= */
async function getFileText(
    drive: Awaited<ReturnType<typeof getDriveClient>>,
    fileId: string,
    mimeType: string
): Promise<string> {
    if (!drive) throw new Error("No Drive client");

    const exportMime = EXPORT_MIMES[mimeType];

    // Google Docs → export as plain text
    if (exportMime) {
        const res = await drive.files.export(
            { fileId, mimeType: exportMime },
            { responseType: "stream" }
        );
        return streamToString(res.data as unknown as Readable, MAX_FILE_BYTES);
    }

    // Download the file as a stream
    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
    );

    // Binary formats → download as buffer, then parse
    if (BINARY_MIMES.has(mimeType)) {
        const buffer = await streamToBuffer(res.data as unknown as Readable, MAX_FILE_BYTES);

        if (mimeType === "application/pdf") {
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const { text } = await extractText(pdf, { mergePages: true });
            return text ?? "";
        }

        if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer });
            return result.value ?? "";
        }
    }

    // Text formats → stream directly to string
    return streamToString(res.data as unknown as Readable, MAX_FILE_BYTES);
}

/* =========================================================
   HEAP PRESSURE CHECK
========================================================= */
function isHeapPressureHigh(): boolean {
    const used = process.memoryUsage().heapUsed;
    return used > HEAP_LIMIT_BYTES;
}

/* =========================================================
   INGESTION (memory-safe, sequential, streaming)
========================================================= */
export async function runIngestion(
    userId: string,
    onlyFileIds?: string[],
    maxFiles?: number
): Promise<IngestResult> {
    const drive = await getDriveClient(userId);
    if (!drive) {
        return { processed: 0, failed: 0, errors: ["Drive not connected"] };
    }

    const prisma = getPrisma();
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    const files: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string | null;
        sizeBytes?: number;
    }> = [];

    const cap = typeof maxFiles === "number" && maxFiles > 0 ? maxFiles : undefined;

    /* =========================================================
       1️⃣ Collect Files (sequential metadata fetch)
    ========================================================= */

    if (onlyFileIds?.length) {
        const ids = cap ? onlyFileIds.slice(0, cap) : onlyFileIds;
        for (const fileId of ids) {
            try {
                const meta = await drive.files.get({
                    fileId,
                    fields: "id, name, mimeType, modifiedTime, size",
                });


                const mime = meta.data.mimeType ?? "";
                if (SUPPORTED_MIMES.has(mime)) {
                    files.push({
                        id: meta.data.id!,
                        name: meta.data.name ?? "Untitled",
                        mimeType: mime,
                        modifiedTime: meta.data.modifiedTime,
                        sizeBytes: meta.data.size ? Number(meta.data.size) || undefined : undefined,
                    });
                }
            } catch {
                errors.push(`Could not get metadata for ${fileId}`);
            }
        }
    } else {
        let pageToken: string | undefined;

        do {
            const list = await drive.files.list({
                pageSize: 100,
                pageToken,
                fields:
                    "nextPageToken, files(id, name, mimeType, modifiedTime, size)",
                q: "trashed = false",
            });

            const pageFiles = list.data.files ?? [];
            console.log("pageFiles", pageFiles)

            for (const f of pageFiles) {
                const mime = f.mimeType ?? "";
                if (SUPPORTED_MIMES.has(mime)) {
                    files.push({
                        id: f.id!,
                        name: f.name ?? "Untitled",
                        mimeType: mime,
                        modifiedTime: f.modifiedTime,
                        sizeBytes: f.size ? Number(f.size) || undefined : undefined,
                    });
                    if (cap && files.length >= cap) {
                        break;
                    }
                }
            }

            if (cap && files.length >= cap) {
                break;
            }

            pageToken = list.data.nextPageToken ?? undefined;
        } while (pageToken && (!cap || files.length < cap));
    }

    /* =========================================================
       2️⃣ Sequential File Processing (concurrency = 1)
    ========================================================= */
    console.log("files", files)
    for (const file of files) {
        // Heap pressure guard: stop early if we're running low on memory
        if (isHeapPressureHigh()) {
            const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

            errors.push(
                `Stopped early: heap pressure too high (${heapMB}MB). Processed ${processed} files, ${files.length - processed - failed} remaining.`
            );
            // eslint-disable-next-line no-console
            console.warn(`[ingest] Stopping early due to heap pressure: ${heapMB}MB used`);
            break;
        }

        console.log("file processing", file)

        try {
            // Skip files that are too large based on metadata
            if (file.sizeBytes && file.sizeBytes > MAX_FILE_BYTES) {
                failed++;
                errors.push(
                    `${file.name}: skipped (file size ${file.sizeBytes} bytes exceeds 5MB limit)`
                );
                continue;
            }

            // Skip unchanged files using modifiedTime in DB
            const existing = await prisma.driveDocument.findUnique({
                where: { fileId_userId: { fileId: file.id, userId } },
            });

            if (
                existing &&
                file.modifiedTime &&
                new Date(file.modifiedTime) <= existing.updatedAt
            ) {
                processed++;
                continue;
            }

            // Extract text via streaming (will abort if > MAX_FILE_BYTES)
            let text: string;
            try {
                text = await getFileText(drive, file.id, file.mimeType);
            } catch (dlErr) {
                failed++;
                const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
                errors.push(`${file.name}: ${msg}`);
                continue;
            }
            console.log("trimmed text", text.trim())

            if (!text.trim()) {
                processed++;
                continue;
            }

            // Chunk text
            const chunks = chunkText(text);
            // Release large string from memory ASAP
            text = "";

            console.log("chunks", chunks)
            if (chunks.length === 0) {
                processed++;
                continue;
            }

            // Store modifiedTime in DB (in updatedAt)
            const updatedAt = file.modifiedTime
                ? new Date(file.modifiedTime)
                : new Date();

            const doc = await prisma.driveDocument.upsert({
                where: { fileId_userId: { fileId: file.id, userId } },
                create: {
                    fileId: file.id,
                    userId,
                    name: file.name,
                    mimeType: file.mimeType,
                    updatedAt,
                },
                update: {
                    name: file.name,
                    mimeType: file.mimeType,
                    updatedAt,
                },
            });

            // Remove old chunks for this document
            await prisma.driveChunk.deleteMany({
                where: { documentId: doc.id },
            });

            /* =====================================================
               Batched embeddings (small batches) + immediate insert
            ===================================================== */

            const totalChunks = chunks.length;

            for (let start = 0; start < totalChunks; start += EMBED_BATCH_SIZE) {
                const end = Math.min(start + EMBED_BATCH_SIZE, totalChunks);
                const batchChunks = chunks.slice(start, end);

                const embeddings = await embedTexts(batchChunks);

                for (let i = 0; i < batchChunks.length; i++) {
                    const vec = embeddings[i];
                    if (!vec) continue;

                    const vectorStr = `[${vec.join(",")}]`;
                    const metadata = {
                        chunkIndex: start + i,
                        totalChunks,
                    };

                    await prisma.$executeRaw`
            INSERT INTO drive_chunks
              (id, document_id, content, embedding, metadata, created_at)
            VALUES
              (gen_random_uuid(), ${doc.id}::uuid, ${batchChunks[i]}, ${vectorStr}::vector, ${JSON.stringify(
                        metadata
                    )}::jsonb, now())
          `;
                }
            }

            processed++;

            // Log heap usage after each file
            // eslint-disable-next-line no-console
            console.log(
                `[ingest] ${file.name}: done. Heap MB:`,
                Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            );
        } catch (e) {
            failed++;
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${file.name}: ${msg}`);
        }
    }

    return { processed, failed, errors };
}
