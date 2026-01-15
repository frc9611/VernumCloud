<template>
  <main>
    <form class="profile-section" @submit.prevent="editUser">
      <div class="left-side">
        <img v-if="pictureUrl" :src="pictureUrl" alt="Foto de Perfil" class="profile-picture">
        
        <form @submit.prevent="submitPicture">
          <div class="profile-image-form">
            <input
              type="file"
              accept="image/*"
              @change="onFileChange"
            />

            <button type="submit" :disabled="!selectedFile">
              Enviar foto
            </button>
          </div>
        </form>
        <h1 class="name">{{userRead.name}}</h1>
        <span>{{userRead.division}}</span>
      </div>
      <div class="right-side">
        <label for="username">Nome de Usuário</label>
        <input type="text" name="username" id="username" v-model="userWrite.username">
        <label for="username">E-mail:</label>
        <input type="text" name="email" id="email" v-model="userRead.email" disabled>
        <label for="birthDate">Data de Nascimento:</label>
        <input type="date" name="birthDate" id="birthDate" v-model="userWrite.birthDate">
        <label for="schoolClass">Turma Escolar:</label>
        <input type="text" name="schoolClass" id="schoolClass" v-model="userWrite.schoolClass">
        <span>Insira apenas informações verdadeiras.</span>
        <button class="button">Atualizar Dados</button>
      </div>
    </form>
  
    <hr>
  <div class="pass-box">
    <form @submit.prevent="editPassword">
      <label for="oldPassword">Senha Atual:</label>
      <input type="password" name="oldPassword" id="oldPassword" v-model="userPassword.oldPassword">
      <label for="newPassword">Senha Nova:</label>
      <input type="password" name="newPassword" id="newPassword" v-model="userPassword.password">
      <button class="button" type="submit">Redefinir Senha</button>
    </form>
  </div>
</main>
</template>

<script setup>
  import { ref, onMounted, reactive } from 'vue'
  import http from '@/services/http.js'
  import { authStore } from '@/store/auth.js'
  import { useRouter } from 'vue-router'
  import { useToast } from "vue-toastification";
  const toast = useToast();
  const router = useRouter();
  const auth = authStore();
  const userId = auth.getId;
  const selectedFile = ref(null);
  const pictureUrl = ref(null);

  loadProfileImage();

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
  let userPassword = reactive({
    oldPassword:'',
    password:'',
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
      toast.error("Erro ao carregar perfil");
    }
  });

  async function editUser(){
    try{
      await http.put('/users/'+userId, userWrite, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      toast.success("Perfil atualizado com sucesso!");
    }catch(error){
      toast.error("Erro ao atualizar perfil");
    }
  }

  async function editPassword() {
    try{
      await http.put('/users/'+userId, userPassword, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      toast.success("Senha alterada com sucesso!");
    }catch(error){
      toast.error("Alteração de senha não autorizada");
    }
  }

  

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedFile.value = file;
}

async function submitPicture() {
  if (!selectedFile.value) {
    toast.error("Selecione uma imagem");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    await http.put(
      `/users/${userId}/picture`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      }
    );

    toast.success("Foto de perfil atualizada com sucesso!");
    selectedFile.value = null;
  } catch (error) {
    toast.error("Erro ao atualizar foto de perfil");
  }
}

async function loadProfileImage() {
  try{
    const response = await http.get(
      `/users/${userId}/picture`,
      {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      }
    );

    pictureUrl.value = URL.createObjectURL(response.data);
  }
  catch(error){
    toast.warning("Erro ao obter foto de perfil");
  }
}
</script>
<style>
  main{
    margin-top: 10%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80%;
    flex-direction: column;
    width: 100%;
  }
  .profile-section{
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 100%;
    align-items: center;
  }
  .profile-section div{
    display: flex;
    flex-direction: column;
    margin: 10px 30px;
  }
  .name{
    margin: 0 !important;
    color: #865faf !important;
  }
  .pass-box, hr{
    margin-top: 10px;
  }
  .pass-box{
    border: 3px solid #865faf;
    padding: 10px 30px;
    color: #865faf;
    border-radius: 10px;
  }
  .pass-box form{
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .profile-picture{
    width: 200px;
    border-radius: 100px;
  }
  .left-side{
    display: flex;
    justify-content: center;
    align-items: center;
    border: 3px solid #865faf;
    padding: 10px 30px;
    color: #865faf;
    border-radius: 10px;
  }

  input[type="text"], 
  input[type="password"], 
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
  input[type="password"]:focus, 
  input[type="date"]:focus, 
  select:focus {
    border-color: #865faf;
    box-shadow: 0 0 0 3px #865faf;
    outline: none;
  }

  .button {
  display: block;
  width: 100%;
  padding: 5px;
  margin-top: 10px;
  background-color: #865faf;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.button:hover {
  background-color: #865faf;
  transform: translateY(-1px);
}

.button:active {
  transform: translateY(0);
}

</style>
