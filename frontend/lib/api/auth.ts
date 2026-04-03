import api from '../axios';

export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post('/api/auth/register', { name, email, password });

export const getMe = () => api.get('/api/auth/me');

export const updateProfile = (data: { name?: string; cursorColor?: string }) =>
  api.put('/api/auth/profile', data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put('/api/auth/password', { currentPassword, newPassword });
