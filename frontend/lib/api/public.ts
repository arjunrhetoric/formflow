import axios from 'axios';

const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

// Attach auth token if available (needed for signup-gated form submissions)
publicApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('formflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const getPublicForm = (slug: string) =>
  publicApi.get(`/api/public/forms/${slug}`);

export const validateForm = (slug: string, answers: Record<string, unknown>) =>
  publicApi.post(`/api/public/forms/${slug}/validate`, { answers });

export const submitForm = (slug: string, answers: Record<string, unknown>, completionTime?: number) =>
  publicApi.post(`/api/public/forms/${slug}/submit`, { answers, completionTime });
