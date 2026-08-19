<template>
  <AppHeader v-if="showHeader" />
  <router-view />
  <footer v-if="showFooter" class="vc-footer">
    <router-link :to="{ name: 'home' }">Home</router-link>
    <span>|</span>
    <router-link :to="{ name: 'about' }">Sobre Nós</router-link>
    <span>|</span>
    <router-link :to="{ name: 'openProcesses' }">Processos Seletivos</router-link>
    <span>|</span>
    <a href="https://9611.team/" target="_blank" rel="noopener">Contatos</a>
  </footer>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import { authStore } from '@/store/auth.js';
import { applyAccent } from '@/services/theme.js';

const route = useRoute();
const auth = authStore();

/* The login and the public application form have no header, like in the mockups. */
const showHeader = computed(() => auth.isAuth && !route.meta?.bare);
const showFooter = computed(() => !!route.meta?.footer);

/*
 * The accent of the whole application is the color of the team currently open. Outside a team,
 * and on the public screens, it falls back to the default purple.
 */
watch(
  () => (route.meta?.bare ? null : auth.activeTenant?.color),
  (color) => applyAccent(color),
  { immediate: true },
);
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
@import './assets/vernum.css';

.vc-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 26px 20px 34px;
  font-size: 0.88rem;
  color: var(--vc-text-muted);
}

.vc-footer a {
  color: var(--vc-text-muted);
  text-decoration: none;
}

.vc-footer a:hover {
  color: var(--vc-purple-strong);
  text-decoration: underline;
}

.vc-footer span {
  color: var(--vc-border-strong);
}
</style>
