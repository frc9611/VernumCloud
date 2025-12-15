import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import http from '@/services/http.js';
import router from '../router';

export const authStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token'));
  const name = ref(localStorage.getItem('name'));
  const divisions = ref(JSON.parse(localStorage.getItem('divisions') || '[]'));
  const roles = ref(JSON.parse(localStorage.getItem('roles') || '[]'));
  const isAuth = ref(false);
  const isAdmin = ref(null);

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

  const isAuthenticated = computed(() => !!token.value && !!name.value);
  const getName = computed(() => name.value);
  const getDivision = computed(() => divisions.value?.[0]?.visibleName);
  const getDivisionColor = computed(() => divisions.value?.[0]?.color);
  const getRole = computed(() => roles.value?.[0]?.name);
  const getToken = computed(() => token.value);

  function setIsAuth(auth) {
    isAuth.value = auth;
  }
  function setIsAdmin(admin) {
    isAdmin.value = admin;
  }

  async function checkToken() {
    if (!token.value) return false;
    try {
      const response = await http.get('/login/verify', {
        headers: { Authorization: 'Bearer ' + token.value },
      });
      return response.status === 200;
    } catch (error) {
      clear();
      return false;
    }
  }

  async function checkRole() {
    if (!token.value) {
      isAdmin.value = false;
      return false;
    }
    try {
      const response = await http.get('/login/verify', {
        headers: { Authorization: 'Bearer ' + token.value },
      });
      const admin = response.data.role?.[0]?.name === 'ADMIN';
      isAdmin.value = admin;
      return admin;
    } catch (error) {
      isAdmin.value = false;
      return false;
    }
  }

  function clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('divisions');
    localStorage.removeItem('roles');
    isAuth.value = false;
    isAdmin.value = null;
    token.value = '';
    name.value = '';
    divisions.value = [];
    roles.value = [];
    router.push('/');
  }

  return {
    token,
    name,
    divisions,
    roles,
    isAuth,
    isAdmin,
    setToken,
    setName,
    setDivisions,
    setRoles,
    setIsAuth,
    setIsAdmin,
    checkToken,
    checkRole,
    clear,
    isAuthenticated,
    getName,
    getDivision,
    getDivisionColor,
    getRole,
    getToken,
  };
});
