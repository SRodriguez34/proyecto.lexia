import { supabase } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.detail ?? error.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Documents
  uploadDocument: async (file: File, matterId?: string) => {
    const token = await getAuthToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(
      `${BASE_URL}/documents/upload${matterId ? `?matter_id=${matterId}` : ""}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  query: (body: { query: string; matter_id?: string; use_hyde?: boolean; scope?: string }) =>
    request<{ data: QueryResult }>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Alerts
  listAlerts: (status?: string) =>
    request<{ data: Alert[] }>(`/alerts${status ? `?status=${status}` : ""}`),
  updateAlertStatus: (id: string, status: string) =>
    request(`/alerts/${id}?status=${status}`, { method: "PATCH" }),

  // Auth
  me: () => request<{ data: Firm }>("/auth/me"),

  // Onboarding
  getOnboardingStatus: () =>
    request<{ data: OnboardingStatus }>("/onboarding/status"),
  saveOnboardingStep: (body: {
    step: number;
    provincia?: string;
    materia_principal?: string;
    completed?: boolean;
  }) =>
    request("/onboarding/step", { method: "PATCH", body: JSON.stringify(body) }),

  // Analytics
  usageStats: () => request<{ data: UsageSummary }>("/analytics/usage"),
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

export interface Firm {
  id: string;
  name: string;
  plan: string;
  plan_limits: Record<string, number>;
  usage_current: Record<string, number>;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
}

export interface OnboardingStatus {
  onboarding_completed: boolean;
  onboarding_step: number;
  materia_principal: string | null;
  provincia: string | null;
}

export interface UsageSummary {
  firm_name: string;
  plan: string;
  plan_limits: Record<string, number>;
  this_month: {
    queries: number;
    documents_indexed: number;
    alerts_generated: number;
    logins: number;
    estimated_hours_saved: number;
  };
  totals: {
    documents: number;
    active_matters: number;
  };
}
