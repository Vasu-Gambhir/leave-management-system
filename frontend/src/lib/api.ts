import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'team_member' | 'approval_manager';
  organization_id: string;
  profile_picture?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  color: string;
  requires_approval: boolean;
  max_days_per_year?: number;
  carry_forward_allowed: boolean;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  calendar_event_id?: string;
  created_at: string;
  updated_at: string;
  users?: User;
  leave_types?: LeaveType;
}

// Auth API
export const authAPI = {
  getGoogleAuthUrl: () => api.get('/auth/google/url'),
  googleCallback: (code: string, organizationDomain: string) => 
    api.post('/auth/google/callback', { code, organizationDomain }),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Leave Requests API
export const leavesAPI = {
  getLeaveRequests: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    api.get('/leaves', { params }),
  createLeaveRequest: (data: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) =>
    api.post('/leaves', data),
  updateLeaveStatus: (id: string, data: { status: 'approved' | 'rejected'; rejection_reason?: string }) =>
    api.patch(`/leaves/${id}/status`, data),
  cancelLeaveRequest: (id: string) => api.patch(`/leaves/${id}/cancel`),
};

// Leave Types API
export const leaveTypesAPI = {
  getLeaveTypes: () => api.get('/leave-types'),
  createLeaveType: (data: Omit<LeaveType, 'id'>) => api.post('/leave-types', data),
  updateLeaveType: (id: string, data: Partial<LeaveType>) => api.put(`/leave-types/${id}`, data),
  deleteLeaveType: (id: string) => api.delete(`/leave-types/${id}`),
  toggleLeaveTypeActive: (id: string) => api.patch(`/leave-types/${id}/toggle-active`),
};

// Organization API
export const organizationAPI = {
  getOrganization: () => api.get('/organizations'),
  updateOrganizationSettings: (data: { name?: string; settings?: Record<string, any> }) =>
    api.put('/organizations/settings', data),
  getUsers: (params?: { page?: number; limit?: number }) =>
    api.get('/organizations/users', { params }),
  updateUserRole: (userId: string, role: User['role']) =>
    api.patch(`/organizations/users/${userId}/role`, { role }),
  deleteUser: (userId: string) => api.delete(`/organizations/users/${userId}`),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/organizations/analytics', { params }),
};