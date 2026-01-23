// main.ts
import { createApp, markRaw } from 'vue';
import App from './App.vue';
import router from './router'; 
import {authStore} from '@/store/auth.js'
import { createPinia } from 'pinia';
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

const app = createApp(App);
const pinia = createPinia(); 
pinia.use(({store}) => {store.router = markRaw(router)});
app.use(pinia); 
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 4,
  timeout: 2500,
  newestOnTop: true
});
app.use(router); 

const auth = authStore(); 

async function verifyAdmin(){
try {
      auth.setIsAdmin(true); 

      const isAdmin = await auth.checkRole(); 
      auth.setIsAdmin(isAdmin);

    } catch (error) {
      console.log('failed check admin:', error);
      auth.setIsAdmin(false);
    }
}

async function initializeAuthAndMount() {
  if (localStorage.getItem('token')) {
    try {
      auth.setIsAuth(true); 
      
      const authorized = await auth.checkToken();
      if(!authorized) router.push('/');
      auth.setIsAuth(true); 
      await verifyAdmin();

    } catch (error) {
      console.log('failed check login:', error);
      auth.setIsAuth(false);
      auth.setIsAdmin(false);
      localStorage.removeItem('token');
    }
  }

  await router.isReady();

  app.mount('#app');
}

initializeAuthAndMount();