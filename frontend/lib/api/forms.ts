import api from '../axios';

export const getForms = () => api.get('/api/forms');
export const createForm = (title: string) => api.post('/api/forms', { title });
export const getForm = (id: string) => api.get(`/api/forms/${id}`);
export const updateForm = (id: string, data: unknown) => api.put(`/api/forms/${id}`, data);
export const deleteForm = (id: string) => api.delete(`/api/forms/${id}`);
export const getHistory = (id: string) => api.get(`/api/forms/${id}/history`);
export const restoreVersion = (id: string, historyId: string) =>
  api.post(`/api/forms/${id}/restore/${historyId}`);

// Collaborator management
export const getCollaborators = (id: string) => api.get(`/api/forms/${id}/collaborators`);
export const addCollaborator = (id: string, email: string) =>
  api.post(`/api/forms/${id}/collaborators`, { email });
export const removeCollaborator = (id: string, userId: string) =>
  api.delete(`/api/forms/${id}/collaborators/${userId}`);
export const joinByToken = (shareToken: string) =>
  api.post(`/api/forms/join/${shareToken}`);
export const regenerateToken = (id: string) =>
  api.post(`/api/forms/${id}/regenerate-token`);
export const updateFormSettings = (id: string, settings: Record<string, unknown>) =>
  api.patch(`/api/forms/${id}/settings`, settings);

