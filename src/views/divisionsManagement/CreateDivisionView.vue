<template>
  <div class="form-container">
    <form class="main-form" @submit.prevent="createDivision">
      <h3>Criar Divisão</h3>
      
      <div class="form-group">
        <label for="visibleName">Nome Visível:</label>
        <input id="visibleName" type="text" v-model="division.visibleName">
      </div>
      
      <div class="form-group">
        <label for="name">Nome no Sistema:</label>
        <input id="name" type="text" v-model="division.name">
      </div>
      
      <div class="form-group">
        <label for="color">Cor:</label>
        <input id="color" type="color" v-model="division.color">
      </div>
      
      <button type="submit" class="buttonLogin">Criar Divisão</button>
    </form>
  </div>
</template>


<script setup>
import { ref, onMounted, reactive } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const auth = authStore()
let division = reactive({
    name:'',
    visibleName:'',
    color:''
  });

async function createDivision(){
    try{
      await http.post('/divisions', division, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      router.push({name: 'editDivisions'});
    }catch(error){
      console.log(error?.response?.data);
    }
  }
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
