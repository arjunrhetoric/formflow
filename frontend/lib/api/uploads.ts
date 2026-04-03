import api from '../axios';

export const signUpload = (folder = 'formflow') =>
  api.post('/api/uploads/sign', { folder });
