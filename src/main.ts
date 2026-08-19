// main.ts
import { createApp, markRaw } from 'vue';
import App from './App.vue';
import router from './router';
import { authStore } from '@/store/auth.js';
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
