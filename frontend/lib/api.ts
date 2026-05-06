const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getFirmId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("firm_id") ?? "";
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Firm-ID": getFirmId(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Documents
  uploadDocument: (file: File, matterId?: string) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(
      `${BASE_URL}/documents/upload${matterId ? `?matter_id=${matterId}` : ""}`,
      {
        method: "POST",
        headers: { "X-Firm-ID": getFirmId() },
        body: form,
      }
    ).then((r) => r.json());
  },
  listDocuments: () => request<{ data: Document[] }>("/documents"),
  deleteDocument: (id: string) =>
    request(`/documents/${id}`, { method: "DELETE" }),

  // Matters
  createMatter: (body: object) =>
    request("/matters", { method: "POST", body: JSON.stringify(body) }),
  listMatters: () => request<{ data: Matter[] }>("/matters"),
  getMatter: (id: string) => request<{ data: Matter }>(`/matters/${id}`),
  updateMatter: (id: string, body: object) =>
    request(`/matters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getMatterSummary: (id: string) =>
    request<{ data: { summary: string } }>(`/matters/${id}/summary`),

  // Query
  query: (body: { query: string; matter_id?: string; use_hyde?: boolean }) =>
    request<{ data: QueryResult }>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Alerts
  listAlerts: (status?: string) =>
    request<{ data: Alert[] }>(`/alerts${status ? `?status=${status}` : ""}`),
  updateAlertStatus: (id: string, status: string) =>
    request(`/alerts/${id}?status=${status}`, { method: "PATCH" }),
};

// Types
export interface Document {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  matter_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface Matter {
  id: string;
  caratula: string;
  client_name: string;
  matter_type: string;
  status: string;
  created_at: string;
  document_count?: number;
  last_activity?: string;
}

export interface QueryResult {
  answer: string;
  sources: Source[];
  query_id: string;
}

export interface Source {
  document_name: string;
  chunk_content: string;
  clause_number: string | null;
  relevance_score: number;
}

export interface Alert {
  id: string;
  firm_id: string;
  status: string;
  affected_documents: string[];
  created_at: string;
  normativa_items?: {
    title: string;
    source: string;
    url: string;
    published_at: string;
  };
}
