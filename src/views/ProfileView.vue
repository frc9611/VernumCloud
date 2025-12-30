<template>
  <div>
    <form @submit.prevent="editUser">
      <div>
        <img src="" alt="Foto de Perfil">
        <h1>{{userRead.name}}</h1>
        <span>{{userRead.division}}</span>
      </div>
      <div>
        <label for="username">Nome de Usuário</label>
        <input type="text" name="username" id="username" v-model="userWrite.username">
        <label for="username">E-mail:</label>
        <input type="email" name="email" id="email" v-model="userRead.email" disabled>
        <label for="birthDate">Data de Nascimento:</label>
        <input type="date" name="birthDate" id="birthDate" v-model="userWrite.birthDate">
        <label for="schoolClass">Turma Escolar:</label>
        <input type="text" name="schoolClass" id="schoolClass" v-model="userWrite.schoolClass">
        <span class="information">Alguns dados só podem ser modificados por um Técnico.</span>
        <button>Atualizar Dados</button>
      </div>
    </form>
  </div>

  <div>
    <form action="">
      <label for="oldPassword">Senha Atual:</label>
      <input type="password" name="oldPassword" id="oldPassword">
      <label for="newPassword">Senha Nova:</label>
      <input type="password" name="newPassword" id="newPassword">
      <label for="repeatNewPassword">Repita a Senha Nova:</label>
      <input type="password" name="repeatNewPassword" id="repeatNewPassword">
      <button type="submit">Redefinir Senha</button>
    </form>
  </div>
</template>

<script setup>
  import { ref, onMounted, reactive } from 'vue'
  import http from '@/services/http.js'
  import { authStore } from '@/store/auth.js'
  import { useRouter } from 'vue-router'
  const router = useRouter()
  const auth = authStore();
  const userId = auth.getId;

  let userRead = reactive({
    email:'',
    name:'',
    division:''
  });
  let userWrite = reactive({
    username:'',
    birthDate:'',
    schoolClass:''
  });

  onMounted(async () => {
    try {
      const response = await http.get('/user/'+userId, {
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      })
      userRead.name = response.data.name
      userWrite.username = response.data.username
      userRead.email = response.data.email
      userRead.division = response.data.divisions?.[0]?.visibleName
      userWrite.birthDate = response.data.birthDate
      userWrite.schoolClass = response.data.schoolClass
    } catch (err) {
      console.error('Erro ao carregar usuário', err)
    }
  });

  async function editUser(){
    try{
      await http.put('/users/'+userId, userWrite, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      router.push({name: 'home'});
    }catch(error){
      console.log(error?.response?.data);
    }
  }
</script>
<style></style>
