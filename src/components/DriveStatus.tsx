"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DriveStatusProps {
  /** Whether the user has connected Drive (we don't have a real check without an API; parent can set from query param or session). */
  connected?: boolean;
  /** Whether ingest is in progress. */
  ingestLoading?: boolean;
  /** Last ingest result for display. */
  ingestResult?: {
    processed: number;
    failed: number;
    errors: string[];
  } | null;
  /** Whether incremental sync is in progress. */
  syncLoading?: boolean;
  /** Last incremental sync result for display. */
  syncResult?: {
    processed: number;
    deleted: number;
  } | null;
  onConnect?: () => void;
  onIngest?: () => void;
  onIncrementalSync?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

export function DriveStatus({
  connected = false,
  ingestLoading = false,
  ingestResult = null,
  syncLoading = false,
  syncResult = null,
  onConnect,
  onIngest,
  onIncrementalSync,
  onDisconnect,
  className,
}: DriveStatusProps) {
  return (
    <Card className={cn("rounded-xl border-2 border-border shadow-md", className)}>
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">Google Drive</h3>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onConnect}
          >
            Connect Google Drive
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onIngest}
              disabled={ingestLoading}
            >
              {ingestLoading ? "Ingesting…" : "One-time ingest"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onIncrementalSync}
              disabled={syncLoading}
            >
              {syncLoading ? "Syncing changes…" : "Incremental sync"}
            </Button>
            {ingestResult && (
              <div className="rounded-md border bg-muted/50 p-2 text-sm">
                <p>
                  Processed: {ingestResult.processed}, Failed:{" "}
                  {ingestResult.failed}
                </p>
                {ingestResult.errors.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-muted-foreground text-xs">
                    {ingestResult.errors.slice(0, 3).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {ingestResult.errors.length > 3 && (
                      <li>…and {ingestResult.errors.length - 3} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
            {syncResult && (
              <div className="rounded-md border bg-muted/50 p-2 text-sm">
                <p>
                  Incremental — Processed: {syncResult.processed}, Deleted:{" "}
                  {syncResult.deleted}
                </p>
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={onDisconnect}
            >
              Disconnect Drive
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
