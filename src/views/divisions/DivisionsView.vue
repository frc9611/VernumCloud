<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Divisões</h1>
        <router-link v-if="auth.can('DIVISION_CREATE')" class="vc-btn" :to="{ name: 'adminDivisions' }">
          Gerenciar divisões
        </router-link>
      </div>

      <p class="vc-muted" style="margin: 0">
        As divisões de {{ auth.activeTenantName }} formam uma árvore: cada divisão pode ter subdivisões,
        sem limite de profundidade.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!tree.length" title="Nenhuma divisão ainda">
        Um administrador da equipe pode criar a primeira divisão pelo painel de administração.
      </EmptyState>

      <div v-else class="vc-stack">
        <DivisionNode v-for="division in tree" :key="division.divisionId" :division="division" :depth="0" />
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import DivisionNode from './DivisionNode.vue';
import { authStore } from '@/store/auth.js';
import { divisions } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

const auth = authStore();
const toast = useToast();
const tree = ref([]);
const loading = ref(true);

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  try {
    const { data } = await divisions.tree(auth.activeTenantId);
    tree.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar divisões'));
  } finally {
    loading.value = false;
  }
}
</script>
