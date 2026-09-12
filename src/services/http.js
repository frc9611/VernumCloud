import axios from 'axios';
import router from '@/router';
import { authStore } from '@/store/auth.js';

/*
 * The axios instance every call goes through. It attaches the token when there is one,
 * which is why the public endpoints work the same before and after the login, and it
 * sends the user back to the login when the server says the token is gone.
 */
const axiosInstance = axios.create({
    baseURL: process.env.VUE_APP_API_URL || 'https://server.frc9611.com:8443' // 'https://vernumserver-prod.onrender.com'
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
                authStore().clear(false);
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('activeTenantId');
            }
            router.push('/');
        }
        return Promise.reject(error);
    }
);

/** Message the server sent with an error, ready to be shown on a toast. */
export function apiMessage(error, fallback) {
    return error?.response?.data?.message || fallback || 'Não foi possível concluir a ação.';
}

export default axiosInstance;
