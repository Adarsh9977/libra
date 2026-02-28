import { getDriveClient } from "./oauth";
import { getPrisma } from "@/lib/db";
import { runIngestion } from "./ingest";

// Re-export for consumers that import from this file
export { runIngestion } from "./ingest";
export type { IngestResult } from "./ingest";

/**
 * Drive Changes API: get startPageToken, then list changes since that token.
 * We use this to detect new/updated/deleted files and update vector DB accordingly.
 */
export async function getStartPageToken(
  userId: string
): Promise<string | null> {
  const drive = await getDriveClient(userId);
  if (!drive) return null;
  const res = await drive.changes.getStartPageToken();
  return res.data.startPageToken ?? null;
}

/**
 * Fetch changes since the given page token. Returns list of changed file IDs and deleted file IDs.
 */
export async function listChanges(
  userId: string,
  pageToken: string
): Promise<{
  newPageToken: string;
  changedFileIds: string[];
  deletedFileIds: string[];
}> {
  const drive = await getDriveClient(userId);
  if (!drive) {
    return { newPageToken: pageToken, changedFileIds: [], deletedFileIds: [] };
  }
  const changedFileIds: string[] = [];
  const deletedFileIds: string[] = [];
  let currentToken: string | undefined = pageToken;

  type ChangesListResponse = {
    data: {
      changes?: Array<{ fileId?: string; removed?: boolean; file?: { id?: string } }>;
      nextPageToken?: string;
      newStartPageToken?: string;
    };
  };

  do {
    const raw = await drive.changes.list({
      pageToken: currentToken,
      fields:
        "nextPageToken, newStartPageToken, changes(fileId, removed, file(id, mimeType))",
    });
    const res = raw as unknown as ChangesListResponse;
    const changes = res.data.changes ?? [];
    for (const c of changes) {
      if (c.removed) {
        if (c.fileId) deletedFileIds.push(c.fileId);
      } else if (c.file?.id) {
        changedFileIds.push(c.file.id);
      }
    }
    currentToken = res.data.nextPageToken ?? undefined;
    if (res.data.newStartPageToken) {
      currentToken = res.data.newStartPageToken;
    }
  } while (currentToken && currentToken !== pageToken);

  return {
    newPageToken: currentToken ?? pageToken,
    changedFileIds: Array.from(new Set(changedFileIds)),
    deletedFileIds: Array.from(new Set(deletedFileIds)),
  };
}

/**
 * Delete document and its chunks by Drive file_id.
 */
async function deleteDocumentByFileId(fileId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.driveDocument.deleteMany({ where: { fileId } });
}

/**
 * Incremental sync: apply changes (re-ingest changed files, remove deleted).
 * Uses the memory-safe runIngestion implementation for changed files.
 */
export async function runIncrementalSync(
  userId: string,
  pageToken: string
): Promise<{ newPageToken: string; processed: number; deleted: number }> {
  const { newPageToken, changedFileIds, deletedFileIds } = await listChanges(
    userId,
    pageToken
  );
  for (const fileId of deletedFileIds) {
    await deleteDocumentByFileId(fileId);
  }
  if (changedFileIds.length === 0) {
    return { newPageToken, processed: 0, deleted: deletedFileIds.length };
  }
  const result = await runIngestion(userId, changedFileIds);
  return {
    newPageToken,
    processed: result.processed,
    deleted: deletedFileIds.length,
  };
}