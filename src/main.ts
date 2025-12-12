import { createApp, markRaw } from 'vue';
import App from './App.vue';
import router from './router'; 
import {authStore} from '@/store/auth.js'
import { createPinia } from 'pinia';

const app = createApp(App);

const pinia = createPinia(); 
pinia.use(({store}) => {store.router = markRaw(router)});

app.use(pinia); 

app.use(router);

if(localStorage.getItem('token')){
    (async () => {
        const auth = authStore();
        try{
            auth.setIsAuth(true);
            await auth.checkToken();
        }catch(error){
            auth.setIsAuth(false);

        }
        
    })()
}

app.mount('#app');