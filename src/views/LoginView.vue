<template>
  <h2>Login</h2>

  <form @submit.prevent="login">
    <input type="text" placeholder="username" v-model="user.username">
    <input type="password" placeholder="*****" v-model="user.password">
    <button type="submit">Login</button>
  </form>
</template>
<script setup>
  import http from '@/services/http.js';
  import { reactive } from 'vue';

  const user = reactive({
    username:'',
    password:''
  });

  async function login(){
    try{
      const {data} = await http.post('/login', user);
      console.log(data);
    }catch(error){
      console.log(error?.response?.data);
    }
  }

</script>
<style lang="scss" scoped>

</style>