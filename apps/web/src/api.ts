import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});
api.interceptors.request.use((c) => {
  const token = localStorage.getItem('token');
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && !location.pathname.match(/login|register/)) {
      localStorage.removeItem('token');
      location.href = '/login';
    }
    return Promise.reject(e);
  },
);
