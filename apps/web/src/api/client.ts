import { supabase } from '../auth/supabase.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', statusCode = 400, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 1. Get access token from Supabase session or localStorage
  let token = localStorage.getItem('euroshub_auth_token') || localStorage.getItem('eliteship_auth_token') || '';
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      token = session.access_token;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle binary / PDF streams
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('text/csv')) {
    if (!response.ok) throw new ApiError('Failed to download file', 'DOWNLOAD_ERROR', response.status);
    return (await response.blob()) as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    const err = json.error || {};
    throw new ApiError(
      err.message || response.statusText || 'An error occurred',
      err.code || 'REQUEST_FAILED',
      response.status,
      err.details
    );
  }

  return json.data as T;
}
