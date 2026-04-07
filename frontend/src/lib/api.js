import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// QR Endpoints
export const generateQR = (subjectId, duration = 15, latitude, longitude) =>
  api.post('/qr/generate', { subjectId, duration, latitude, longitude });

export const getActiveSession = (subjectId) =>
  api.get(`/qr/active/${subjectId}`);

export const invalidateSession = (sessionId) =>
  api.delete(`/qr/invalidate/${sessionId}`);

// Attendance Endpoints
export const getSessionStudents = (sessionId) =>
  api.get(`/attendance/session/${sessionId}/students`);

export default api;
