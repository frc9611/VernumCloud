<template>
  <div class="admin">
    <h1>Toda a CyberRain</h1>

    <input
      class="table-search"
      type="text"
      placeholder="Buscar por nome, username, e-mail ou divisão"
      v-model="search"
    />

    <table class="main-table">
      <thead>
        <tr>
          <th>Foto</th>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Divisão</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="user in filteredData" :key="user.userId">
          <td><img :src="profileImages[user.userId]" class="profilePicture"></td>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.divisions[0].visibleName }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter } from 'vue-router'
import { useToast } from "vue-toastification"

const toast = useToast()
const router = useRouter()
const auth = authStore()
const data = ref([])
const search = ref('')
const profileImages = ref({})
 
onMounted(async () => {
  try {
    const response = await http.get('/users', {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    data.value = response.data
  } catch (err) {
    toast.error("Erro ao carregar lista de usuários.")
  }
})

const filteredData = computed(() => {
  if (!search.value) return data.value.filter(user => user.active)

  const term = search.value.toLowerCase()

  return data.value.filter(user =>
    (user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term) ||
    user.divisions[0].visibleName.toLowerCase().includes(term)) &&
    user.active
  )
})

async function loadProfileImage(userId) {
  try{
    if (profileImages.value[userId]) return

    const response = await http.get(
      `/users/${userId}/picture`,
      {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${auth.getToken}`
        }
      }
    )
    profileImages.value[userId] = URL.createObjectURL(response.data)
  }catch(error){
    profileImages.value[userId] = null
  }
}

watch(filteredData, users => {
  users.forEach(u => loadProfileImage(u.userId))
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
  tbody tr{
    cursor: pointer;
  }
  .profilePicture{
    width: 40px;
  }
  .createButton{
    color: white;
    background-color: #1e7f4d;
    font-size: 17px;
    padding: 5px 10px;
    border-radius: 10px;
    border: black 1px;
    cursor: pointer;
  }

</style>
