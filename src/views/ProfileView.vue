<template>
  <div>
    <form @submit.prevent="editUser">
      <div>
        <img v-if="pictureUrl" :src="pictureUrl" alt="Foto de Perfil">
        
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
    <form @submit.prevent="editPassword">
      <label for="oldPassword">Senha Atual:</label>
      <input type="password" name="oldPassword" id="oldPassword" v-model="userPassword.oldPassword">
      <label for="newPassword">Senha Nova:</label>
      <input type="password" name="newPassword" id="newPassword" v-model="userPassword.password">
      <button type="submit">Redefinir Senha</button>
    </form>
  </div>
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
<style></style>
