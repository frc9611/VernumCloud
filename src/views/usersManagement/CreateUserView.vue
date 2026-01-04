<template>
  <div class="form-container">
    <form class="main-form" @submit.prevent="createUser">
      <h3>Cadastrar Membro da Equipe</h3>
      
      <div class="form-group">
        <label for="nome">Nome Completo:</label>
        <input id="nome" type="text" v-model="user.name" >
      </div>
      
      <div class="form-group">
        <label for="username">Username:</label>
        <input id="username" type="text" v-model="user.username" >
      </div>

      <div class="form-group">
        <label for="username">Senha Inicial:</label>
        <input id="username" type="password" v-model="user.password" >
        <span>Crie uma senha para acesso temporário do usuário.</span><br>
        <span>Peça para o usuário modificar a senha após a criação da conta.</span>
      </div>
      
      <div class="form-group">
        <label for="email">E-mail:</label>
        <input id="email" type="email" v-model="user.email" >
      </div>
      
      <div class="form-group">
        <label for="nascimento">Data de Nascimento:</label>
        <input id="nascimento" type="date" v-model="user.birthDate" >
      </div>
      
      <div class="form-group">
        <label for="turma">Turma:</label>
        <input id="turma" type="text" v-model="user.schoolClass">
      </div>
      
      <div class="form-group">
        <label for="divisao">Divisão:</label>
        <select id="divisao" v-model="user.division">
          <option 
            v-for="division in allDivisions" 
            :key="division.divisionId" 
            @click="goToEdit(user.userId)" 
            :value="division.name" 
            :selected="user.division === division.name"
          >
            {{ division.visibleName }}
          </option>
        </select>
      </div>
      
      <button type="submit" class="buttonLogin">Cadastrar</button>
    </form>
  </div>
</template>


<script setup>
import { ref, onMounted, reactive } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from "vue-toastification"

const toast = useToast()
const router = useRouter()
const route = useRoute()
const auth = authStore()
const allDivisions = ref([])
let user = reactive({
    name:'',
    username:'',
    email:'',
    division:'',
    birthDate:'',
    password:'',
    schoolClass:'Sem Turma'
  });


onMounted(async () => {
  try {
    const response = await http.get('/divisions', {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    allDivisions.value = response.data
  } catch (err) {
    toast.error('Erro ao carregar divisões')
  }
});

async function createUser(){
    try{
      await http.post('/users', user, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      router.push({name: 'users'});
    }catch(error){
      toast.error('Erro ao criar usuário. Verifique se o usuário já existe')
    }
  }
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

input, 
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
