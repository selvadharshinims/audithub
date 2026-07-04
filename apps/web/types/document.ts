import type { DocumentType } from "@audithub/types";

export interface DocumentRow {
  id: string;
  clientId: string;
  uploadedBy: string;
  type: DocumentType;
  name: string;
  url: string;
  size: number;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
  uploader: { id: string; name: string };
}
