import {ref, computed} from 'vue';
import {defineStore} from 'pinia';
import http from '@/services/http.js';
import router from '../router';

export const authStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token'));
    //const username = ref(localStorage.getItem('username'));
    const name = ref(localStorage.getItem('name'));
    const divisions = ref(JSON.parse(localStorage.getItem('divisions')));
    const roles = ref(JSON.parse(localStorage.getItem('roles')));
    const isAuth = ref(false);

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

    function setRoles(rolesValue) {
        localStorage.setItem('roles', JSON.stringify(rolesValue));
        roles.value = rolesValue;
    }

    const isAuthenticated = computed(() => {
        return token.value && name.value;
    })

    const getName = computed(() => {
        return name.value;
    })

    const getDivision = computed(() => {
        return (divisions.value)[0].visibleName;
    })

    const getRole = computed(() => {
        return (roles.value)[0].name;
    })

    function setIsAuth(auth){
        isAuth.value = auth;
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
            clear();
            return false;
        }
    }

    function clear(){
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        localStorage.removeItem('divisions');
        localStorage.removeItem('roles');
        isAuth.value = false;
        token.value = '';
        name.value = '';
        divisions.value = '';
        roles.value = '';
        router.push('/login');
    }

    return {
        token,
        name,
        divisions,
        setToken,
        setName,
        setDivisions,
        setRoles,
        checkToken,
        isAuthenticated,
        getName,
        getDivision,
        getRole,
        clear,
        setIsAuth,
        isAuth
    }
});