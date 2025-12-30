<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Faça login no Vernum Cloud</h2>

      <template v-if="!auth.isAuth">
        <form @submit.prevent="login">
          <div class="field">
            <input
              type="text"
              placeholder="Usuário"
              v-model="user.username"
              required
            />
          </div>

          <div class="field">
            <input
              type="password"
              placeholder="Senha"
              v-model="user.password"
              required
            />
          </div>
          <button type="submit" class="buttonLogin">Entrar</button>
        </form>
      </template>

      <template v-else>
        <p class="already-auth">Você já está logado.</p>
      </template>
    </div>
  </div>
</template>

<script setup>
  import http from '@/services/http.js';
  import { reactive } from 'vue';
  import {authStore} from '@/store/auth.js'
  import { useRouter } from 'vue-router';
  import { useToast } from "vue-toastification";
  const toast = useToast();

  const router = useRouter();

const auth = authStore();

  const user = reactive({
    username:'',
    password:''
  });

  async function login(){
    try{
      const {data} = await http.post('/login', user);
      console.log(data);
      auth.setToken(data.accessToken);
      auth.setName(data.name);
      auth.setUserId(data.userId);
      auth.setDivisions(data.divisions);
      auth.setRoles(data.role);
      auth.setIsAuth(true);
      ((data.role)[0].name == 'ADMIN')? auth.setIsAdmin(true) : auth.setIsAdmin(false);
      router.push({name: 'home'});
    }catch(error){
      console.log(error?.response?.data);
      toast.error('Usuário ou senha incorretos!');
    }
  }

</script>
<style>
* {
  box-sizing: border-box;
}

.login-container {
  height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  background: #171717;
  width: 100%;
  max-width: 380px;
  padding: 2rem;
  border-radius: 14px;
  box-shadow: 0 15px 40px #865faf;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.6rem;
  color: #865faf;
}

.field {
  margin-bottom: 1rem;
}

.field input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field input:focus {
  outline: none;
  border-color: #865faf;
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.buttonLogin {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: none;
  background: #865faf;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.buttonLogin:hover {
  background: #694b89;
}

.buttonLogin:active {
  transform: scale(0.98);
}

.already-auth {
  text-align: center;
  font-weight: 500;
  color: #444;
}

</style>