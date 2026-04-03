import axios from 'axios';

const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

export const getPublicForm = (slug: string) =>
  publicApi.get(`/api/public/forms/${slug}`);

export const submitForm = (slug: string, answers: Record<string, unknown>) =>
  publicApi.post(`/api/public/forms/${slug}/submit`, { answers });
