<template>
  <h2>Login</h2>
  <template v-if="!auth.isAuth">
  <form @submit.prevent="login">
    <input type="text" placeholder="username" v-model="user.username">
    <input type="password" placeholder="*****" v-model="user.password">
    <button type="submit">Login</button>
  </form>
</template>
<template v-else>
Já possui sessão
</template>
</template>
<script setup>
  import http from '@/services/http.js';
  import { reactive } from 'vue';
  import {authStore} from '@/store/auth.js'

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
      auth.setDivisions(data.divisions);
      auth.setRoles(data.role);
      auth.setIsAuth(true);
    }catch(error){
      console.log(error?.response?.data);
    }
  }

</script>
<style lang="scss" scoped>

</style>