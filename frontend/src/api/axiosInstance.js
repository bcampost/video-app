import axios from 'axios';

const token = localStorage.getItem('auth_token');

const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    Authorization: token ? `Bearer ${token}` : '',
  }
});

export default axiosInstance;
