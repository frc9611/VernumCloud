<template>
  <div class="admin">
    <h1>Gerenciamento da Equipe</h1>
    <span class="warning">
      Você está acessando opções sensíveis e confidenciais, NÃO PERMANEÇA COM LOGIN SEM SUPERVISÃO
    </span>

    <input
      class="table-search"
      type="text"
      placeholder="Buscar por nome, username ou e-mail"
      v-model="search"
    />

    <table class="main-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Username</th>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Divisão</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="user in filteredData" :key="user.userId" @click="goToEdit(user.userId)">
          <td>
            <span :class="user.active ? 'status active' : 'status inactive'">
              {{ user.active ? 'Ativo' : 'Inativo' }}
            </span>
          </td>
          <td>{{ user.username }}</td>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.divisions[0].visibleName }}</td>
        </tr>
      </tbody>
    </table>
    <span class="information" style="margin-top: 10px;">Usuários inativos não possuem acesso ao sistema. <br>Para deletar definitivamente um usuário, contate a equipe de P&D.</span>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import http from '@/services/http.js'
import { authStore } from '@/store/auth.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = authStore()
const data = ref([])
const search = ref('')

onMounted(async () => {
  try {
    const response = await http.get('/users', {
      headers: {
        Authorization: `Bearer ${auth.getToken}`
      }
    })
    data.value = response.data
  } catch (err) {
    console.error('Erro ao carregar usuários', err)
  }
})

const filteredData = computed(() => {
  if (!search.value) return data.value

  const term = search.value.toLowerCase()

  return data.value.filter(user =>
    user.username.toLowerCase().includes(term) ||
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  )
})
function goToEdit(userId) {
  router.push(`/admin/users/${userId}`)
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

</style>
