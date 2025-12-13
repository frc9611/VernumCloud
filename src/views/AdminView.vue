<template>
  <div class="admin">
    <h1>Administração da Equipe</h1>
    <h3>CyberRain #9611</h3>
    <span class="warning">Você está acessando opções sensíveis e confidenciais, NÃO PERMANEÇA COM LOGIN SEM SUPERVISÃO</span>
    <ul class="main-menu">
      <li><Router-link :to="{ name: 'admin' }" class="menu-button">
        Gerenciar Equipe
      </Router-link></li>
      <li><Router-link :to="{ name: 'admin' }" class="menu-button">
        Gerenciar Divisões
      </Router-link></li>
      <li><Router-link :to="{ name: 'admin' }" class="menu-button">
        Ver Registros Diários
      </Router-link></li>
      <li><Router-link :to="{ name: 'admin' }" class="menu-button">
        Processos Seletivos
      </Router-link></li>
    </ul>
  </div>
</template>

<script setup>
</script>
<style>
  .admin {
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
