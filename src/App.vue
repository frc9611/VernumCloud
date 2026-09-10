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
import { preferencesStore } from '@/store/preferences.js';
import { ADMIN_ACCENT, applyTheme } from '@/services/theme.js';

const route = useRoute();
const auth = authStore();
const prefs = preferencesStore();

/* The login and the public application form have no header, like in the mockups. */
const showHeader = computed(() => auth.isAuth && !route.meta?.bare);
const showFooter = computed(() => !!route.meta?.footer);

/*
 * One decision paints the whole application: palette and accent, together, because the accent
 * tones depend on the surface they sit on.
 *
 * The administrator team and the platform screens are always the black palette with the red
 * accent — the person has to see at a glance that what they touch there reaches every team.
 * Anywhere else the palette is what the person chose (light, dark, or whatever the OS says) and
 * the accent is the color of the team open, falling back to the default purple outside a team
 * and on the public screens.
 *
 * A route that declares `ownTheme` is left alone: it paints itself and nothing here may repaint it.
 */
watch(
  () => {
    const admin = !!route.meta?.platform || auth.activeTenantIsSystem;
    return {
      own: !!route.meta?.ownTheme,
      mode: admin ? 'admin' : prefs.resolvedTheme,
      accent: admin ? ADMIN_ACCENT : route.meta?.bare ? null : auth.activeTenant?.color,
    };
  },
  ({ own, mode, accent }) => {
    /*
     * The wall on the television is the one screen that owns its palette: always dark, in the color
     * of the team it is showing. Repainting it from here would blank it in the middle of a marathon
     * — /me answering with the preference of whoever happens to be logged in on that browser, or
     * the operating system flipping to light at dawn, would turn it into a white lamp on the wall.
     */
    if (own) return;
    applyTheme(mode, accent);
    prefs.setActiveMode(mode);
  },
  { immediate: true },
);

/* The preferences follow the session: fetched when it opens, forgotten when it closes. */
watch(
  () => auth.isAuth,
  (value) => (value ? prefs.load() : prefs.reset()),
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
