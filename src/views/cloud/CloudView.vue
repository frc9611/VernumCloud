<template>
  <h1>Arquivos (Cloud)</h1>
  <form @submit.prevent="createFolder">
    <input type="text" name="folderName" placeholder="Nome da Pasta" v-model="newFolder.name">
    <button type="submit">Criar Pasta</button>
  </form>
  <h3>Pasta Atual: {{ openedFolder.name }}</h3>
  <p class="directory">{{ directory }}</p>
  <p class="folder" v-if="openedFolder.id != 1" @click="goToFolder(openedFolder.parent.id)">..</p>
  <p class="folder" v-for="folder in childFolders" :key="folder.id" @click="goToFolder(folder.id)">{{ folder.name }}</p>
</template>
<script setup>
import { ref, onMounted, watch, reactive } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter,useRoute } from 'vue-router'
import { useToast } from "vue-toastification"

const toast = useToast();
const router = useRouter();
const route = useRoute();
const auth = authStore();
const childFolders = ref([]);
const openedFolder = ref({});
const directory = ref("");
let newFolder = reactive({
    name:'',
    parentFolderId: route.params.id
  });

async function fetchFolders() {
  try {
    const response = await http.get('/cloud/childFolders/' + route.params.id, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    });
    childFolders.value = response.data;
  } catch (err) {
    toast.error("Erro ao carregar pastas.");
  }

  try{
    const response = await http.get('/cloud/folder/' + route.params.id, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    });
    openedFolder.value = response.data;
  }catch (err) {
    toast.error("Erro ao carregar pasta atual.");
  }

  try{
    const response = await http.get('/cloud/folder/getDirectory/' + route.params.id, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    });
    directory.value = response.data;
  }catch (err) {
    directory.value = "não foi possível obter o diretório";
  }
}

onMounted(fetchFolders);

watch(() => route.params.id, (newId) => {
  fetchFolders();
  newFolder.parentFolderId = newId;
});

function goToFolder(folderId){
  router.push(`/cloud/${folderId}`);
}

async function createFolder(){
  try{
      await http.post('/cloud/folder', newFolder, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      toast.success("Pasta " + newFolder.name + " criada com sucesso!");
      newFolder.name = '';
      fetchFolders();
    }catch(error){
      toast.error("Erro ao criar pasta");
    }
}
</script>
<style>
  h1{
    color: #865faf !important;
  }
  .folder{
    cursor:pointer;
  }
  .directory{
    font-size: 12px;
  }
  
</style>