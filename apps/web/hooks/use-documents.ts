"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentType } from "@audithub/types";
import type { DocumentRow } from "@/types/document";
import { ApiError } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("audithub.access") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof body === "object" && body && "error" in body ? String(body.error) : res.statusText;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

const KEY = (clientId: string) => ["clients", clientId, "documents"] as const;

export function useClientDocuments(clientId: string | undefined) {
  return useQuery({
    queryKey: clientId ? KEY(clientId) : ["clients", "documents"],
    queryFn: () => jsonRequest<DocumentRow[]>(`/clients/${clientId}/documents`, { method: "GET" }),
    enabled: Boolean(clientId),
  });
}

export function useUploadDocument(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      type,
      name,
    }: {
      file: File;
      type: DocumentType;
      name?: string;
    }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      if (name) form.append("name", name);
      return jsonRequest<DocumentRow>(`/clients/${clientId}/documents`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
      qc.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export function useDeleteDocument(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jsonRequest<void>(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
      qc.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export async function downloadDocument(doc: DocumentRow): Promise<void> {
  const res = await fetch(`${BASE}/documents/${doc.id}/download`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
