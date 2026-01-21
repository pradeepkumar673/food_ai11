// Get backend URL from environment variable or use development proxy
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with base URL
import axios from 'axios';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});