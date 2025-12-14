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
            auth.checkRole()? auth.setIsAdmin(true) : auth.setIsAdmin(false);
            await auth.checkToken();
            
            
        }catch(error){
            console.log('failed check login: ', error);
            auth.setIsAuth(false);
            auth.setIsAdmin(false);

        }
        
    })()
}

app.mount('#app');