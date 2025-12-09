import {ref} from 'vue';
import {defineStore} from 'pinia';

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

    return {
        setToken,
        setName,
        setDivisions
    }
});