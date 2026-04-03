import api from '../axios';

export const getResponses = (id: string, page = 1, limit = 20) =>
  api.get(`/api/forms/${id}/responses?page=${page}&limit=${limit}`);

export const exportCSV = (id: string) =>
  api.get(`/api/forms/${id}/export.csv`, { responseType: 'blob' });

export const exportJSON = (id: string) =>
  api.get(`/api/forms/${id}/export.json`, { responseType: 'blob' });
