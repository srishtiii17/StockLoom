const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code || `API Error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN_ERROR';
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errCode = data?.error?.code || `HTTP_${res.status}`;
      const errMsg = data?.error?.message || `Request failed with status ${res.status}`;
      throw new ApiError(res.status, errCode, errMsg);
    }

    // Success response: standard { data: ... }
    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network / connection error
    throw new ApiError(0, 'CONNECTION_ERROR', err.message || 'Failed to connect to backend server');
  }
}
