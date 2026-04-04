import api from '../axios';

export const signUpload = (folder = 'formflow', resourceType = 'auto') =>
  api.post('/api/uploads/sign', { folder, resourceType });
