<template>
  <div class="home">
    <h1>Olá {{ auth.getName }}</h1>
    <span v-for="announcement in data" :key="announcement.announcementId" class="information"><strong> {{ announcement.title }} </strong> <br> {{ announcement.content }}</span> 

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
      <li><Router-link :to="{ name: 'listusers' }" class="menu-button">
        Equipe
      </Router-link></li>
    </ul>
  </div>
</template>

<script setup>
  import {authStore} from '@/store/auth.js';
import { onMounted, ref } from 'vue';
import http from '@/services/http.js';
import { useToast } from "vue-toastification"

const toast = useToast();
  const auth = authStore();
const data = ref([]);

  onMounted(async () => {
    try{
      const response = await http.get('/allAnnouncements', {
        headers: {
        Authorization: `Bearer ${auth.getToken}`
        }
      });
      data.value = response.data;
    }catch (err){
      toast.error("Erro ao carregar avisos");
      console.log(err?.response?.data);
      console.log(err.message)
    }
  });
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