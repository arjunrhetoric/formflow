import api from '../axios';

export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post('/api/auth/register', { name, email, password });

export const getMe = () => api.get('/api/auth/me');
