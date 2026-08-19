<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="open__brand">
        <VernumLogo :size="40" :with-wordmark="false" />
        <h1 class="vc-title">Processos <strong>Seletivos</strong></h1>
      </div>

      <p class="vc-muted" style="margin: 0">
        Equipes que estão com inscrições abertas. Você pode se candidatar sem ter conta no Vernum Cloud.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <EmptyState v-else-if="!processes.length" title="Nenhum processo aberto agora">
        Volte mais tarde ou fale com a equipe que você quer entrar.
        <template #actions>
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'login' }">Voltar ao login</router-link>
        </template>
      </EmptyState>

      <div v-else class="vc-grid">
        <article v-for="process in processes" :key="process.publicToken" class="vc-card">
          <header class="vc-card__header" :style="{ background: process.tenantColor || '#8864AE' }">
            <span>{{ process.tenantName }}</span>
            <span v-if="process.tenantTeamNumber" class="vc-card__icon">#{{ process.tenantTeamNumber }}</span>
          </header>
          <div class="vc-card__body">
            <strong>{{ process.name }}</strong>
            <p v-if="process.description">{{ process.description }}</p>
            <p v-if="process.endDate" class="vc-faint" style="margin: 0">
              Inscrições até {{ formatDate(process.endDate) }}
            </p>
            <router-link class="vc-btn" :to="{ name: 'apply', params: { token: process.publicToken } }">
              Candidatar-se
            </router-link>
          </div>
        </article>
      </div>

      <hr class="vc-divider" />
      <div class="vc-row">
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'login' }">Já sou da equipe: entrar</router-link>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import VernumLogo from '@/components/VernumLogo.vue';
import EmptyState from '@/components/EmptyState.vue';
import { publicRecruitment } from '@/services/api.js';

/* Public list of processes with open applications. Reachable from the login screen. */
const processes = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await publicRecruitment.open();
    processes.value = data;
  } catch (error) {
    processes.value = [];
  } finally {
    loading.value = false;
  }
});

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>

<style scoped>
.open__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vc-title strong {
  font-weight: 700;
}

.open__brand .vc-title {
  font-weight: 300;
}
</style>
