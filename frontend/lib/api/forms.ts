import api from '../axios';

export const getForms = () => api.get('/api/forms');
export const createForm = (title: string) => api.post('/api/forms', { title });
export const getForm = (id: string) => api.get(`/api/forms/${id}`);
export const updateForm = (id: string, data: unknown) => api.put(`/api/forms/${id}`, data);
export const deleteForm = (id: string) => api.delete(`/api/forms/${id}`);
export const getHistory = (id: string) => api.get(`/api/forms/${id}/history`);
export const restoreVersion = (id: string, historyId: string) =>
  api.post(`/api/forms/${id}/restore/${historyId}`);
