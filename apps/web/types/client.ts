import type { ClientStatus } from "@audithub/types";

export interface ClientRecord {
  id: string;
  orgId: string;
  assignedStaffId: string | null;
  name: string;
  pan: string | null;
  gstin: string | null;
  aadhaar: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends ClientRecord {
  companies: Array<{
    id: string;
    legalName: string;
    businessType: string | null;
    regNo: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    createdAt: string;
  }>;
}
