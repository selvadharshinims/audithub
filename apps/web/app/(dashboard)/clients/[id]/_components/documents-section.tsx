"use client";

import { useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { DOCUMENT_TYPE, type DocumentType } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  downloadDocument,
  useClientDocuments,
  useDeleteDocument,
  useUploadDocument,
} from "@/hooks/use-documents";
import { formatDate } from "@/lib/format";
import type { DocumentRow } from "@/types/document";

const TYPE_LABEL: Record<DocumentType, string> = {
  PAN: "PAN",
  AADHAAR: "Aadhaar",
  GST_CERT: "GST cert",
  BANK: "Bank",
  CHEQUE: "Cheque",
  DEED: "Deed",
  AUDIT_REPORT: "Audit report",
  OTHER: "Other",
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsSection({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientDocuments(clientId);
  const upload = useUploadDocument(clientId);
  const del = useDeleteDocument(clientId);

  const [type, setType] = useState<DocumentType>("OTHER");
  const [customName, setCustomName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please pick a file");

    try {
      await upload.mutateAsync({
        file,
        type,
        name: customName.trim() || undefined,
      });
      setFile(null);
      setCustomName("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Upload failed");
    }
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await del.mutateAsync(doc.id);
  }

  async function handleDownload(doc: DocumentRow) {
    try {
      await downloadDocument(doc);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleUpload} className="grid grid-cols-1 gap-3 rounded-md border bg-muted/30 p-3 md:grid-cols-[1fr_140px_auto]">
          <div className="space-y-1">
            <Label>File</Label>
            <input
              ref={inputRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPE.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>&nbsp;</Label>
            <Button type="submit" disabled={upload.isPending || !file}>
              <Upload className="h-4 w-4" />
              {upload.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Display name (optional)</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Leave blank to use the file name"
            />
          </div>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y">
            {data.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {TYPE_LABEL[doc.type]} · {humanSize(doc.size)} · {formatDate(doc.createdAt)} · {doc.uploader.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    disabled={del.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
