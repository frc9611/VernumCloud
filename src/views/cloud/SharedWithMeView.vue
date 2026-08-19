<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Compartilhados comigo</h1>
      <p class="vc-muted" style="margin: 0">
        Pastas e arquivos que outras equipes liberaram para você, para uma das suas divisões ou para uma
        equipe da qual você faz parte.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!items.length" title="Nada compartilhado com você">
        Quando outra equipe compartilhar algo, aparece aqui.
      </EmptyState>

      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead><tr><th>Item</th><th>Equipe dona</th><th>Nível</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id || item.fileId">
              <td>{{ item.id ? '📁' : '📄' }} {{ item.name }}</td>
              <td>{{ item.tenantName }}</td>
              <td>{{ accessLabel(item.access) }}</td>
              <td style="text-align: right">
                <router-link v-if="item.id" class="vc-btn vc-btn--ghost vc-btn--small"
                             :to="{ name: 'cloudFolder', params: { id: item.id } }">
                  Abrir
                </router-link>
                <button v-else class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="download(item)">
                  Baixar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import { cloud } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/* What other tenants shared with the user, straight from the shares. */
const toast = useToast();
const items = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await cloud.sharedWithMe();
    items.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar compartilhamentos'));
  } finally {
    loading.value = false;
  }
});

async function download(file) {
  try {
    const response = await cloud.download(file.fileId);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName || file.name || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao baixar arquivo'));
  }
}

function accessLabel(level) {
  return {
    NONE: 'Sem acesso',
    VIEW: 'Ver e baixar',
    EDIT: 'Ver, enviar e alterar',
    MANAGE: 'Gerenciar e compartilhar',
  }[level] || level;
}
</script>
