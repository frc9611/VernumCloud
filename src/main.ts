import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; 

// Importação do Pinia
import { createPinia } from 'pinia'; // 1. Importe a função de criação

// Crie a aplicação
const app = createApp(App);

// 2. Crie a instância do Pinia
const pinia = createPinia(); 

// 3. ANEXAR O PINIA À APLICAÇÃO VUE PRIMEIRO!
app.use(pinia); // Use a instância 'pinia'

// 4. Anexar outras dependências
app.use(router);

// 5. Montar a aplicação
app.mount('#app');