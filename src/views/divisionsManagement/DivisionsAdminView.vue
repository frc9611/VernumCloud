<template>
  <div class="admin">
    <h1>Gerenciamento das Divisões</h1>
    <span class="warning">
      Você está acessando opções sensíveis e confidenciais, NÃO PERMANEÇA COM LOGIN SEM SUPERVISÃO
    </span>

    <button class="createButton" @click="goToCreate()">Cadastrar Nova Divisão</button>

    <input
      class="table-search"
      type="text"
      placeholder="Buscar por nome da divisão"
      v-model="search"
    />

    <table class="main-table">
      <thead>
        <tr>
          <th>Nome</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="division in filteredData" :key="division.divisionId" @click="goToEdit(division.divisionId)">
          <td>{{ division.visibleName }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter } from 'vue-router'
import { useToast } from "vue-toastification"

const toast = useToast()
const router = useRouter()
const auth = authStore()
const data = ref([])
const search = ref('')

onMounted(async () => {
  try {
    const response = await http.get('/divisions', {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    data.value = response.data
  } catch (err) {
    toast.error("Erro ao carregar divisões.")
  }
})

const filteredData = computed(() => {
  if (!search.value) return data.value

  const term = search.value.toLowerCase()

  return data.value.filter(division =>
    division.visibleName.toLowerCase().includes(term)
  )
})
function goToEdit(userId) {
  router.push(`/admin/division/${userId}`)
}
function goToCreate(){
  router.push({name: 'createDivision'})
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
  tbody tr{
    cursor: pointer;
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
