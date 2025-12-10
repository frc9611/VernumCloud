import {ref} from 'vue';
import {defineStore} from 'pinia';
import http from '@/services/http.js';

export const authStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token'));
    //const username = ref(localStorage.getItem('username'));
    const name = ref(localStorage.getItem('name'));
    const divisions = ref(JSON.parse(localStorage.getItem('divisions')));

    function setToken(tokenValue) {
        localStorage.setItem('token', tokenValue);
        token.value = tokenValue;
    }
    function setName(nameValue) {
        localStorage.setItem('name', nameValue);
        name.value = nameValue;
    }
    function setDivisions(divisionsValue) {
        localStorage.setItem('divisions', JSON.stringify(divisionsValue));
        divisions.value = divisionsValue;
    }

    async function checkToken(){
        if (!token.value) return false;
        try {
            const response = await http.get("/login/verify", {
                headers: { Authorization: 'Bearer ' + token.value },
            });
            //TODO: Remove this console.log
            console.log('checkToken response', {
                status: response.status,
                data: response.data,
                headers: response.headers,
            });
            return response.status === 200;
        } catch (error) {
            console.error('checkToken error:', {
                status: error?.response?.status,
                data: error?.response?.data,
                headers: error?.response?.headers,
                request: error?.request,
                message: error?.message,
                toJSON: error?.toJSON ? error.toJSON() : undefined
            });
            return false;
        }
    }

    return {
        token,
        name,
        divisions,
        setToken,
        setName,
        setDivisions,
        checkToken
    }
});