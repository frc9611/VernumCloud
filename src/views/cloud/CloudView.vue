<template>
  <div class="file-manager-container">
    
    <header class="top-bar">
        <label for="file-upload" class="btn-primary">
        Enviar Arquivo
    </label>
        <input
          id="file-upload"
          type="file"
          accept="*"
          @change="uploadFile"
        />
      <form @submit.prevent="createFolder" class="create-form">
        <input 
          type="text" 
          name="folderName" 
          placeholder="Nome da nova pasta..." 
          v-model="newFolder.name"
          class="input-styled"
          required
        >
        <button type="submit" class="btn-primary">
          <span>+</span> Criar Pasta
        </button>
      </form>
    </header>

    <div class="navigation-bar">
      <div class="current-path">
        <span class="label">Local:</span>
        <span class="path-text">{{ directory || '/' }}</span>
      </div>
      <h3 class="folder-title">{{ openedFolder.name }}</h3>
    </div>

    <hr class="divider">

    <div class="folder-grid">
      <div 
        class="folder-card back-folder" 
        v-if="openedFolder.id != 1" 
        @click="goToFolder(openedFolder.parent.id)"
      >
        <div class="icon-wrapper back-icon">
          <img class="folderPicture" src="../../assets/folder.png" alt="Voltar">
        </div>
        <span class="folder-name">Voltar (..)</span>
      </div>

      <div 
        class="folder-card" 
        v-for="folder in childFolders" 
        :key="folder.id" 
        @click="goToFolder(folder.id)"
      >
        <div class="icon-wrapper">
          <img class="folderPicture" src="../../assets/folder.png" alt="Pasta">
        </div>
        <span class="folder-name">{{ folder.name }}</span>
        <br>
        <span class="deleteBtn" @click.stop="deleteFolder(folder.id)">Deletar</span>
      </div>
      <div 
        class="folder-card" 
        v-for="file in filesInFolder" 
        :key="file.fileId" 
        @click="goToFile(file.fileId)"
      >
        <div class="icon-wrapper">
          <img class="folderPicture" src="../../assets/file.png" alt="Pasta">
        </div>
        <span class="folder-name">{{ file.name }}</span>
        <br>
        <span class="deleteBtn" @click.stop="deleteFile(file.fileId)">Deletar</span>
      </div>
    </div>

  </div>
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
const filesInFolder = ref({});
const directory = ref("");
const selectedFile = ref(null);

let newFolder = reactive({
    name:'',
    parentFolderId: route.params.id
  });

async function fetchFolders() {
  try{
    try{
      const response = await http.get('/cloud/folder/' + route.params.id, {
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      });
      openedFolder.value = response.data;
    }catch (err) {
      throw new Error("Erro ao carregar informações da pasta.");
    }

    try {
      const response = await http.get('/cloud/childFolders/' + route.params.id, {
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      });
      childFolders.value = response.data;
    } catch (err) {
      throw new Error("Erro ao carregar o conteúdo.");
    }

  }catch(err){
    toast.error(err.message);
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
  fetchFiles();
}

async function fetchFiles() {
  try{
    const response = await http.get('/cloud/folder/' + route.params.id + '/listFiles', {
      headers:{
        Authorization: `Bearer ${auth.getToken}`
      }
    });
    filesInFolder.value = response.data;
  }catch(err){
    toast.error(err.message);
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

async function deleteFolder(folderId){
  try{
      await http.delete('/cloud/folder/' + folderId, {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }});
      toast.success("Pasta deletada com sucesso!");
      fetchFolders();
    }catch(error){
      toast.warning("A pasta possui conteúdo e não pode ser deletada!");
    }
}

function onFileChange(){
  const file = event.target.files[0];
  if (!file) return;

  selectedFile.value = file;
}

async function uploadFile(){
  onFileChange();
  if (!selectedFile.value) {
    toast.error("Selecione um arquivo");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("folderId", route.params.id);

  try {
    await http.post(
      `/cloud/uploadFile`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      }
    );

    toast.success("Enviando...");
    fetchFiles();
    selectedFile.value = null;
  } catch (error) {
    toast.error("Erro!");
  }
}

function deleteFile(fileId){
  toast.info("Em implementação. \n Nada foi deletado.");
}

function goToFile(fileId){
  toast.info("Em implementação.");
}

</script>
<style>
  :root {
  --primary-color: #865faf;
  --primary-hover: #6a4b8c;
  --bg-color: #f8f9fa;
  --card-bg: #ffffff;
  --text-main: #333;
  --text-light: #666;
  --border-radius: 8px;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.1);
}

.file-manager-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: #333;
}

/* --- Cabeçalho --- */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 {
  color: #865faf;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.create-form {
  display: flex;
  gap: 10px;
}

.input-styled {
  padding: 0.6rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
  min-width: 250px;
}

.input-styled:focus {
  border-color: #865faf;
}

.btn-primary {
  background-color: #865faf;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s, transform 0.1s;
}

.btn-primary:hover {
  background-color: #6a4b8c;
}

.btn-primary:active {
  transform: scale(0.98);
}

input[type="file"] {
  display: none;
}

.file-upload {
  border: 1px solid #ccc;
  display: inline-block;
  padding: 6px 12px;
  cursor: pointer;
}

/* --- Navegação --- */
.navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.current-path {
  background: #f0f0f5;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #555;
}

.label {
  font-weight: bold;
  margin-right: 5px;
  color: #865faf;
}

.folder-title {
  margin: 0;
  font-size: 1.2rem;
  color: #444;
}

.divider {
  border: none;
  border-top: 1px solid #eee;
  margin-bottom: 2rem;
}

/* --- Grid de Pastas --- */
.folder-grid {
  display: grid;
  /* Cria colunas automáticas de no mínimo 140px */
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
  gap: 1.5rem;
}

.folder-card {
  background-color: white;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}

.folder-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(134, 95, 175, 0.15); /* Sombra roxa suave */
  border-color: #e0d4f0;
}

.icon-wrapper {
  margin-bottom: 10px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folderPicture {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.folder-name {
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  color: #333;
  word-break: break-word; /* Quebra nomes longos */
  line-height: 1.2;
}

.deleteBtn{
  font-size: 14px;
  color:rgb(180, 0, 0);
}

/* Estilo específico para o botão de voltar */
.back-folder {
  background-color: #f9f9f9;
  border-style: dashed;
}

.back-folder .folder-name {
  color: #888;
}

/* Responsividade para telas pequenas */
@media (max-width: 600px) {
  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .create-form {
    flex-direction: column;
  }
  
  .input-styled {
    width: 100%;
  }
  
  .folder-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
  
</style>