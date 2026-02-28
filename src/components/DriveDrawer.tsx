"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DriveStatus } from "@/components/DriveStatus";
import { useToast } from "@/components/Toast";

type DriveDocSummary = {
    id: string;
    name: string;
    mimeType: string;
    updatedAt: string;
};

export interface DriveDrawerProps {
    open: boolean;
    onClose: () => void;
}

/** Map common MIME types to friendly labels + icon colors. */
function mimeLabel(mime: string): { label: string; color: string } {
    if (mime.includes("pdf")) return { label: "PDF", color: "text-red-500" };
    if (mime.includes("wordprocessing") || mime.includes("msword"))
        return { label: "DOCX", color: "text-blue-500" };
    if (mime.includes("spreadsheet") || mime.includes("excel"))
        return { label: "XLSX", color: "text-green-500" };
    if (mime.includes("presentation") || mime.includes("powerpoint"))
        return { label: "PPTX", color: "text-orange-500" };
    if (mime.includes("google-apps.document"))
        return { label: "Google Doc", color: "text-blue-400" };
    if (mime.includes("text/plain") || mime.includes("text/markdown"))
        return { label: "Text", color: "text-muted-foreground" };
    if (mime.includes("text/csv"))
        return { label: "CSV", color: "text-green-600" };
    return {
        label: mime.split("/").pop() ?? "File",
        color: "text-muted-foreground",
    };
}

export function DriveDrawer({ open, onClose }: DriveDrawerProps) {
    const { toast } = useToast();
    const [connected, setConnected] = React.useState(false);
    const [ingestLoading, setIngestLoading] = React.useState(false);
    const [ingestResult, setIngestResult] = React.useState<{
        processed: number;
        failed: number;
        errors: string[];
    } | null>(null);
    const [syncLoading, setSyncLoading] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState<{
        processed: number;
        deleted: number;
    } | null>(null);
    const [documents, setDocuments] = React.useState<DriveDocSummary[]>([]);
    const [documentsLoading, setDocumentsLoading] = React.useState(false);
    const [syncToken, setSyncToken] = React.useState<string | null>(null);

    /* ── Fetch helpers ── */

    const fetchStatus = React.useCallback(() => {
        fetch("/api/drive/status?userId=default")
            .then((r) => r.json())
            .then((d) => {
                if (d.connected === true) setConnected(true);
            })
            .catch(() => { });
    }, []);

    const fetchDocuments = React.useCallback(async () => {
        try {
            setDocumentsLoading(true);
            const res = await fetch("/api/drive/documents?limit=50");
            if (!res.ok) return;
            const data = (await res.json()) as DriveDocSummary[];
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            // ignore
        } finally {
            setDocumentsLoading(false);
        }
    }, []);

    // Check OAuth redirect params on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("drive") === "connected") {
            setConnected(true);
            window.history.replaceState({}, "", window.location.pathname);
        }
        const err = params.get("error");
        if (err) {
            console.error("OAuth error:", decodeURIComponent(err));
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, []);

    // Fetch status on mount
    React.useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Refresh when drawer opens
    React.useEffect(() => {
        if (open) {
            fetchStatus();
            void fetchDocuments();
        }
    }, [open, fetchStatus, fetchDocuments]);

    /* ── Actions ── */

    const connectDrive = React.useCallback(() => {
        fetch("/api/drive/oauth")
            .then((r) => r.json())
            .then((d) => {
                if (d.url) window.location.href = d.url;
            })
            .catch(console.error);
    }, []);

    const disconnectDrive = React.useCallback(async () => {
        try {
            const res = await fetch("/api/drive/status?userId=default", {
                method: "DELETE",
            });
            if (!res.ok) console.error("Failed to disconnect Drive");
        } catch (e) {
            console.error(e);
        } finally {
            setConnected(false);
            setSyncToken(null);
            setIngestResult(null);
            setSyncResult(null);
            setDocuments([]);
        }
    }, []);

    const runIngest = React.useCallback(() => {
        setIngestLoading(true);
        setIngestResult(null);
        toast("Ingesting Drive files in background…");
        onClose();

        fetch("/api/drive/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "default", maxFiles: 50 }),
        })
            .then((res) => res.json())
            .then((data) => {
                const processed = data.processed ?? 0;
                const failed = data.failed ?? 0;
                setIngestResult({ processed, failed, errors: data.errors ?? [] });
                void fetchDocuments();
                if (failed > 0) {
                    toast(`Ingest done: ${processed} processed, ${failed} failed`, "error");
                } else {
                    toast(`Ingest complete: ${processed} files processed`, "success");
                }
            })
            .catch((e) => {
                const msg = e instanceof Error ? e.message : String(e);
                setIngestResult({ processed: 0, failed: 0, errors: [msg] });
                toast(`Ingest failed: ${msg}`, "error");
            })
            .finally(() => setIngestLoading(false));
    }, [fetchDocuments, toast, onClose]);

    const runIncremental = React.useCallback(async () => {
        setSyncLoading(true);
        setSyncResult(null);
        toast("Incremental sync running in background…");
        onClose();

        try {
            let token = syncToken;
            if (!token) {
                const startRes = await fetch("/api/drive/sync/start?userId=default");
                if (!startRes.ok) {
                    const err = await startRes.json().catch(() => ({}));
                    throw new Error(err.details ?? err.error ?? "Failed to get sync token");
                }
                const startData = (await startRes.json()) as { pageToken?: string };
                if (!startData.pageToken) throw new Error("No page token returned");
                token = startData.pageToken;
                setSyncToken(token);
            }

            const res = await fetch("/api/drive/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: "default", pageToken: token }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.details ?? err.error ?? "Sync failed");
            }
            const data = (await res.json()) as {
                newPageToken?: string;
                processed?: number;
                deleted?: number;
            };
            if (data.newPageToken) setSyncToken(data.newPageToken);
            setSyncResult({
                processed: data.processed ?? 0,
                deleted: data.deleted ?? 0,
            });
            void fetchDocuments();
            toast(`Sync complete: ${data.processed ?? 0} updated, ${data.deleted ?? 0} deleted`, "success");
        } catch (e) {
            setSyncResult({ processed: 0, deleted: 0 });
            const msg = e instanceof Error ? e.message : String(e);
            toast(`Sync failed: ${msg}`, "error");
        } finally {
            setSyncLoading(false);
        }
    }, [syncToken, fetchDocuments, toast, onClose]);

    /* ── Render ── */

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20"
                aria-hidden
                onClick={onClose}
            />

            {/* Drawer panel */}
            <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l-2 border-border bg-card shadow-2xl">
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                    <span className="font-medium">Google Drive</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable body */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4">
                        <DriveStatus
                            connected={connected}
                            ingestLoading={ingestLoading}
                            ingestResult={ingestResult}
                            syncLoading={syncLoading}
                            syncResult={syncResult}
                            onConnect={connectDrive}
                            onIngest={runIngest}
                            onIncrementalSync={runIncremental}
                            onDisconnect={disconnectDrive}
                        />

                        <div className="mt-4 border-t border-border pt-3">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Indexed documents
                                </span>
                                {documentsLoading && (
                                    <span className="text-xs text-muted-foreground">
                                        Loading…
                                    </span>
                                )}
                            </div>

                            {documents.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    No documents ingested yet.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {documents.map((doc) => {
                                        const { label, color } = mimeLabel(doc.mimeType);
                                        return (
                                            <li
                                                key={doc.id}
                                                className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className={color}
                                                    >
                                                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                                                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {doc.name}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {label}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </aside>
        </>
    );
}
