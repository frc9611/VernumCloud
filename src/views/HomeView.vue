<template>
  <div class="home">
    <h1>Olá {{ auth.getName }}</h1>
    <span class="information">Sistema em testes</span> 

    <ul class="main-menu">
      <li><Router-link :to="{ name: 'home' }" class="menu-button">
        Registro diário
      </Router-link></li>
      <li><Router-link :to="{ name: 'home' }" class="menu-button">
        Fórum
      </Router-link></li>
      <li><Router-link :to="{ name: 'home' }" class="menu-button">
        Arquivos
      </Router-link></li>
      <li><Router-link :to="{ name: 'home' }" class="menu-button">
        Minha Divisão
      </Router-link></li>
      <li><Router-link :to="{ name: 'home' }" class="menu-button">
        Equipe
      </Router-link></li>
    </ul>
  </div>
</template>

<script setup>
  import {authStore} from '@/store/auth.js'
  const auth = authStore();
</script>

<style>
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }

  h1 {
    color: #5c288f;
    margin-bottom: 25px;
  }
</style>