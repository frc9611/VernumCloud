// main.ts
import { createApp, markRaw } from 'vue';
import App from './App.vue';
import router from './router';
import { authStore } from '@/store/auth.js';
import { preferencesStore } from '@/store/preferences.js';
import { applyTheme, resolveTheme } from '@/services/theme.js';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';

const app = createApp(App);
const pinia = createPinia();
pinia.use(({ store }) => { store.router = markRaw(router) });
app.use(pinia);
app.use(Toast, {
  transition: 'Vue-Toastification__bounce',
  maxToasts: 4,
  timeout: 2500,
  newestOnTop: true
});
app.use(router);

const auth = authStore();
const prefs = preferencesStore();

/*
 * The palette is painted from the localStorage mirror before anything else happens, so a person
 * who chose dark does not get a white page while /me loads. The administrator palette has to
 * wait for the session, because it depends on which team is open; App.vue takes over from here.
 */
applyTheme(resolveTheme(prefs.theme));

/*
 * The session is loaded before the app mounts, so the router guard already knows the
 * teams of the user and can decide between the dashboard, the team chooser and the
 * waiting screen without a flash of the wrong screen.
 */
async function initializeAuthAndMount() {
  if (localStorage.getItem('token')) {
    await auth.loadMe();
  } else {
    auth.ready = true;
  }

  await router.isReady();
  app.mount('#app');
}

initializeAuthAndMount();
