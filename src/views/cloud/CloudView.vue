<template>
  <h1>Arquivos (Cloud)</h1>
  <h3>Pasta Atual: {{ openedFolder.name }}</h3>
  <p class="folder" @click="goToFolder(openedFolder.parent.id)">..</p>
  <p class="folder" v-for="folder in childFolders" :key="folder.id" @click="goToFolder(folder.id)">{{ folder.name }}</p>
</template>
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter,useRoute } from 'vue-router'
import { useToast } from "vue-toastification"

const toast = useToast();
const router = useRouter();
const route = useRoute();
const auth = authStore();
const childFolders = ref([]);
const openedFolder = ref([]);

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
}

onMounted(fetchFolders);

watch(() => route.params.id, fetchFolders);

function goToFolder(folderId){
  router.push(`/cloud/${folderId}`);
}
</script>
<style>
  h1{
    color: #865faf !important;
  }
  .folder{
    cursor:pointer;
  }
  
</style>