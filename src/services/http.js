import axios from 'axios';
import router from '@/router';
import { authStore } from '@/store/auth.js';

const axiosInstance = axios.create({
    baseURL:'http://localhost:8080'
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            try {
                const auth = authStore();
                auth.clear();
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('name');
                localStorage.removeItem('userId');
                localStorage.removeItem('divisions');
                localStorage.removeItem('roles');
            }
            router.push('/');
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;