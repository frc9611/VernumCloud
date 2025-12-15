<template>
  <div class="admin">
    <h1>Edição de Usuário</h1>
    <span class="warning">
      Você está acessando opções sensíveis e confidenciais, NÃO PERMANEÇA COM LOGIN SEM SUPERVISÃO
    </span>
    <form @submit.prevent="login">
      <label>Nome Completo:</label>
      <input type="text" :value="user.name">
      <label>Username:</label>
      <input type="text" :value="user.username">
      <label>E-mail:</label>
      <input type="text" :value="user.email">
      <label>Data de Nascimento:</label>
      <input type="date" :value="user.birthDate">
      <label>Turma:</label>
      <input type="text" :value="user.schoolClass">
      <label>Status:</label>
      <select>
        <option value="true" :selected="user.active">Ativo</option>
        <option value="false" :selected="!(user.active)">Inativo</option>
      </select>
      <label>Divisão:</label>
      <select>
        <option v-for="division in allDivisions" :key="division.divisionId" @click="goToEdit(user.userId)" :value="division.divisionId" :selected="user.divisions?.[0]?.name === division.name">{{ division.visibleName }}</option>
      </select>
    </form>
  </div>
</template>


<script setup>
  import { ref, onMounted, computed } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const auth = authStore()
const allDivisions = ref([])
const user = ref({})
const userId = route.params.id;


onMounted(async () => {
  try {
    const response = await http.get('/divisions', {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    allDivisions.value = response.data
  } catch (err) {
    console.error('Erro ao carregar divisões', err)
  }
  try {
    const response = await http.get('/user/'+userId, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    user.value = response.data
  } catch (err) {
    console.error('Erro ao carregar divisões', err)
  }
})
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
