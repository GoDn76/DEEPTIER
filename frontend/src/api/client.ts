import {
  AnalyzeDisruptionRequest,
  AnalyzeDisruptionResponse,
  ApiClientError,
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalResponse,
  AuditEvent,
  AuditVerifyResponse,
  CreateApprovalRequest,
  CsvImportResponse,
  LoginResponse,
  MockRfqResponse,
  ProblemDetail,
  RerouteRequest,
  RerouteResponse,
  SapPushResponse,
  SapPurchaseRequisitionPayload,
  SeedResetResponse,
  SimulateRequest,
  TierLinkDto,
  TierMapGraphResponse,
  TierNodeDto,
  UserInfoResponse,
  WhatIfSimulationResponse,
} from './types';

export * from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'deeptier.accessToken';
const USERNAME_KEY = 'deeptier.username';
const ROLE_KEY = 'deeptier.role';

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorizedCallback = handler;
}

export function getStoredSession(): LoginResponse | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  const role = localStorage.getItem(ROLE_KEY) as LoginResponse['role'] | null;
  if (!accessToken || !username || !role) return null;
  return { accessToken, tokenType: 'Bearer', username, role };
}

export function saveStoredSession(session: LoginResponse | null) {
  if (session) {
    localStorage.setItem(TOKEN_KEY, session.accessToken);
    localStorage.setItem(USERNAME_KEY, session.username);
    localStorage.setItem(ROLE_KEY, session.role);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

const PUBLIC_AUTH_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { idempotent?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isPublicAuth = PUBLIC_AUTH_PATHS.has(path);

  if (!isPublicAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (!(init.body instanceof FormData) && init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.idempotent) {
    headers.set('Idempotency-Key', crypto.randomUUID());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(options.timeoutMs ?? 30000),
  });

  if (response.status === 401 && !isPublicAuth) {
    saveStoredSession(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    } else if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
  }

  const rawText = await response.text();
  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    const problem = (parsed && typeof parsed === 'object' ? parsed : null) as ProblemDetail | null;
    const detail =
      problem?.detail ||
      problem?.message ||
      (typeof parsed === 'string' && parsed.trim() ? parsed : response.statusText) ||
      `Request failed with status ${response.status}`;

    throw new ApiClientError(response.status, detail, problem?.title, problem?.errors);
  }

  return parsed as T;
}

export function api<T>(path: string, init: RequestInit = {}, idempotent = false): Promise<T> {
  return request<T>(path, init, { idempotent });
}
export const getSession = getStoredSession;
export const setSession = saveStoredSession;

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<UserInfoResponse>('/api/auth/me'),
};

export const seedApi = {
  reset: (seed = 20261121) =>
    request<SeedResetResponse>(`/api/seed/reset?seed=${encodeURIComponent(seed)}`, {
      method: 'POST',
    }),
};

export const tierMapApi = {
  getGraph: () => request<TierMapGraphResponse>('/api/tier-map/graph'),
  getNodes: () => request<TierNodeDto[]>('/api/tier-map/nodes'),
  getLinks: () => request<TierLinkDto[]>('/api/tier-map/links'),
  importCsv: (file: File, mode: 'replace' | 'append') => {
    const formData = new FormData();
    formData.append('file', file);
    return request<CsvImportResponse>(`/api/supply-chain/import/csv?mode=${mode}`, {
      method: 'POST',
      body: formData,
    });
  },
  downloadTemplate: async () => {
    const token = getAccessToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch('/api/supply-chain/import/template', { headers });
    if (res.status === 401) {
      saveStoredSession(null);
      if (onUnauthorizedCallback) onUnauthorizedCallback();
      throw new ApiClientError(401, 'Session expired');
    }
    if (!res.ok) {
      throw new ApiClientError(res.status, 'Failed to download CSV template');
    }
    return res.text();
  },
};

export const disruptionApi = {
  analyze: (payload: AnalyzeDisruptionRequest) =>
    request<AnalyzeDisruptionResponse>(
      '/api/agent/analyze-disruption',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { timeoutMs: 60000 },
    ),
};

export const whatIfApi = {
  simulate: (payload: SimulateRequest) =>
    request<WhatIfSimulationResponse>('/api/whatif/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const logisticsApi = {
  reroute: (payload: RerouteRequest) =>
    request<RerouteResponse>(
      '/api/logistics/reroute',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { timeoutMs: 45000 },
    ),
};

export const approvalsApi = {
  list: (status?: string) =>
    request<ApprovalResponse[]>(
      status ? `/api/approvals?status=${encodeURIComponent(status)}` : '/api/approvals',
    ),
  get: (id: string) => request<ApprovalResponse>(`/api/approvals/${encodeURIComponent(id)}`),
  create: (payload: CreateApprovalRequest) =>
    request<ApprovalResponse>(
      '/api/approvals',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { idempotent: true },
    ),
  approve: (id: string, body: ApprovalDecisionRequest = {}) =>
    request<ApprovalDecisionResponse>(
      `/api/approvals/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      { idempotent: true },
    ),
  reject: (id: string, body: ApprovalDecisionRequest = {}) =>
    request<ApprovalDecisionResponse>(
      `/api/approvals/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      { idempotent: true },
    ),
};

export const rfqsApi = {
  list: () => request<MockRfqResponse[]>('/api/rfqs'),
  getSapPayload: (id: string) =>
    request<SapPurchaseRequisitionPayload>(`/api/rfqs/${encodeURIComponent(id)}/sap-payload`),
  pushSap: (id: string) =>
    request<SapPushResponse>(`/api/rfqs/${encodeURIComponent(id)}/push-sap`, {
      method: 'POST',
    }),
};

export const auditApi = {
  list: () => request<AuditEvent[]>('/api/audit'),
  listByScenario: (scenarioId: string) =>
    request<AuditEvent[]>(`/api/audit/events/scenario/${encodeURIComponent(scenarioId)}`),
  verify: () => request<AuditVerifyResponse>('/api/audit/verify'),
};
