<template>
  <ul>
    <li><Router-link :to="{name:'login'}">Login</Router-link></li>
    <li><Router-link :to="{name:'home'}">Home</Router-link></li>
    <li><Router-link :to="{name:'about'}">Sobre o Vernum Cloud</Router-link></li>
    <li>
      <template v-if="auth.isAuth">
        {{ auth.getName }}
        {{ auth.getDivision }}
        <button @click="logout">Logout</button>
      </template>
      <template v-else>
        Sem Login
      </template>
    </li>
  </ul>
<router-view/>
</template>
<script setup>
  import {authStore} from '@/store/auth.js'
  import { useRouter } from 'vue-router';

const auth = authStore();

const router = useRouter();

function logout(){
  auth.clear();
  router.push({name: 'login'});
}
</script>
<style lang="scss" scoped>

</style>