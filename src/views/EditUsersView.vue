<template>
  <div class="form-container">
    <form class="main-form" @submit.prevent="login">
      <h3>Editar Membro da Equipe</h3>
      
      <div class="form-group">
        <label for="nome">Nome Completo:</label>
        <input id="nome" type="text" :value="user.name" >
      </div>
      
      <div class="form-group">
        <label for="username">Username:</label>
        <input id="username" type="text" :value="user.username" >
      </div>
      
      <div class="form-group">
        <label for="email">E-mail:</label>
        <input id="email" type="text" :value="user.email" >
      </div>
      
      <div class="form-group">
        <label for="nascimento">Data de Nascimento:</label>
        <input id="nascimento" type="date" :value="user.birthDate" >
      </div>
      
      <div class="form-group">
        <label for="turma">Turma:</label>
        <input id="turma" type="text" :value="user.schoolClass">
      </div>
      
      <div class="form-group">
        <label for="status">Status:</label>
        <select id="status">
          <option value="true" :selected="user.active">Ativo</option>
          <option value="false" :selected="!(user.active)">Inativo</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="divisao">Divisão:</label>
        <select id="divisao">
          <option 
            v-for="division in allDivisions" 
            :key="division.divisionId" 
            @click="goToEdit(user.userId)" 
            :value="division.divisionId" 
            :selected="user.divisions?.[0]?.name === division.name"
          >
            {{ division.visibleName }}
          </option>
        </select>
      </div>
      
      <button type="submit" class="buttonLogin">Confirmar</button>
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

<style scoped>
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

.form-container {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.main-form {
  background: #dddddd;
  padding: 30px 40px;
  border-radius: 12px;
  box-shadow: 0 4px 15px #865faf;
  width: 100%;
  max-width: 500px;
}

h3 {
  color: #865faf;
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 2px solid #865faf;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #865faf;
  font-size: 0.95em;
}

input[type="text"], 
input[type="date"], 
select {
  width: 100%;
  padding: 12px;
  border: 1px solid #865faf;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 1em;
  color: #865faf;
  transition: border-color 0.3s, box-shadow 0.3s;
}

input[type="text"]:focus, 
input[type="date"]:focus, 
select:focus {
  border-color: #865faf;
  box-shadow: 0 0 0 3px #865faf;
  outline: none;
}

.buttonLogin {
  display: block;
  width: 100%;
  padding: 15px;
  margin-top: 30px;
  background-color: #865faf;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.buttonLogin:hover {
  background-color: #865faf;
  transform: translateY(-1px);
}

.buttonLogin:active {
  transform: translateY(0);
}
</style>
