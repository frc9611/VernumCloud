<template>
  <div class="about centerText">
    <h1>Sobre o Vernum Cloud</h1>
    <hr>
    <div class="longText">
    <p>O Vernum Cloud é um projeto desenvolvido pela equipe de P&D (Pesquisa e Desenvolvimento) da equipe de FRC <strong>CyberRain #9611</strong>. <br> Aqui, a equipe tem uma plataforma própria para gerenciar arquivos, registros diários e manter contato com outros integrantes através de um fórum. Além disso, tudo pode ser restringido à própria divisão ou à equipe toda, conforme for necessário. <br><br> É com o Vernum Cloud também que os dados dos integrantes são armazenados e controlados pelos técnicos da equipe, que possuem atribuições para criar e gerenciar processos de seleção de pessoas para a equipe, conforme demanda de cada divisão.</p>
    <br><br><br><br>
    <span class="serverData" v-if="serverStatus == 'connected'">Informações do Servidor: <br><br> Hora UTC: {{ UTCTime }} <br> Hora Local do Servidor: {{ localTime }} <br> Timezone do Servidor: {{ timezone }} <br> Versão do Servidor: {{ vernumVersion }}</span>
    <span class="serverData" v-else-if="serverStatus == 'connecting'">Informações do Servidor: <br><br> Obtendo Informações...</span>
    <span class="serverData" v-else>Informações do Servidor: <br><br> Falha ao conectar com o Servidor.<br>Contate a equipe de P&D.</span>
    </div>
  </div>
</template>
<script setup>
  import { ref } from 'vue';
  import http from '@/services/http.js';
  let UTCTime = ref("");
  let localTime = ref("");
  let vernumVersion = ref("");
  let timezone = ref("");
  let serverStatus = ref("connecting");
  updateInfo();
  async function updateInfo(){
    try{
      const {data} = await http.get('/serverInfo');
      localTime.value = data.timeLocal;
      UTCTime.value = data.timeUTC;
      vernumVersion = data.vernumVersion;
      timezone = data.timezone;
      serverStatus.value = "connected";
    }catch(error){
      serverStatus.value = "failed";
    }
  }
</script>
<style>
  .longText{
    width: 80%;
    max-width: 900px;
    text-align: center;
    margin: 0 auto;
    font-size: 18px;
  }
  .serverData{
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
  }
</style>