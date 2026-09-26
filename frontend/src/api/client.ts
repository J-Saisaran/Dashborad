let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

const BASE_URL = 'http://localhost:5000/api';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Strictly required for sending/receiving HttpOnly cookies
  };

  let response = await fetch(url, fetchOptions);

  // If token expired, attempt automatic silent refresh via HttpOnly cookie
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          setAccessToken(refreshData.data.accessToken);
          // Retry original request with newly issued access token
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          response = await fetch(url, { ...options, headers, credentials: 'include' });
        }
      } else {
        setAccessToken(null);
      }
    } catch {
      setAccessToken(null);
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorInfo = json?.error || {
      code: 'HTTP_ERROR',
      message: response.statusText || 'An unexpected error occurred',
    };
    throw new ApiError(response.status, errorInfo.code, errorInfo.message, errorInfo.details);
  }

  return json?.data as T;
}

// Typed API services
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await apiFetch<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setAccessToken(res.accessToken);
    return res;
  },
  getMe: async () => {
    return apiFetch<{ user: any }>('/auth/me');
  },
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },
};

export const dashboardApi = {
  getStats: async () => {
    return apiFetch<{ stats: any }>('/dashboard/stats');
  },
};

export const clientApi = {
  getClients: async () => {
    return apiFetch<{ clients: any[] }>('/clients');
  },
  createClient: async (data: { name: string; email: string; company: string }) => {
    return apiFetch<{ client: any }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const projectApi = {
  getProjects: async (params?: { page?: number; limit?: number; clientId?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.clientId) query.set('clientId', params.clientId);
    const qs = query.toString();
    return apiFetch<{ projects: any[]; pagination: any }>(`/projects${qs ? `?${qs}` : ''}`);
  },
  getProjectById: async (id: string) => {
    return apiFetch<{ project: any }>(`/projects/${id}`);
  },
  createProject: async (data: { name: string; description?: string; clientId: string }) => {
    return apiFetch<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateProject: async (id: string, data: { name?: string; description?: string }) => {
    return apiFetch<{ project: any }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteProject: async (id: string) => {
    return apiFetch<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
  getActivities: async (projectId: string) => {
    return apiFetch<{ activities: any[] }>(`/projects/${projectId}/activities`);
  },
};

export const taskApi = {
  getTasks: async (params?: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const qs = query.toString();
    return apiFetch<{ tasks: any[]; pagination: any }>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTaskById: async (id: string) => {
    return apiFetch<{ task: any }>(`/tasks/${id}`);
  },
  createTask: async (data: {
    title: string;
    description?: string;
    priority: string;
    dueDate: string;
    projectId: string;
    assignedToId?: string;
  }) => {
    return apiFetch<{ task: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateTask: async (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assignedToId?: string | null;
  }) => {
    return apiFetch<{ task: any }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteTask: async (id: string) => {
    return apiFetch<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

export const userApi = {
  getUsers: async (role?: string) => {
    const qs = role ? `?role=${role}` : '';
    return apiFetch<{ users: any[] }>(`/users${qs}`);
  },
};

export const notificationApi = {
  getNotifications: async (unreadOnly?: boolean) => {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return apiFetch<{ notifications: any[] }>(`/notifications${qs}`);
  },
  markRead: async (id: string) => {
    return apiFetch<{ notification: any }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },
  markAllRead: async () => {
    return apiFetch<{ count: number }>('/notifications/read-all', {
      method: 'PATCH',
    });
  },
};

