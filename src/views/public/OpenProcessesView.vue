<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="open__brand">
        <!-- A visitor has no header, so the brand stands here; a member already sees it up there. -->
        <VernumLogo v-if="!auth.isAuth" :size="40" :with-wordmark="false" />
        <h1 class="vc-title">Processos <strong>Seletivos</strong></h1>
      </div>

      <p class="vc-muted" style="margin: 0">
        <template v-if="auth.isAuth">
          Equipes que estão com inscrições abertas. Você pode se candidatar a outra equipe sem sair da sua.
        </template>
        <template v-else>
          Equipes que estão com inscrições abertas. Você pode se candidatar sem ter conta no Vernum Cloud.
        </template>
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <EmptyState v-else-if="!processes.length" title="Nenhum processo aberto agora">
        Volte mais tarde ou fale com a equipe que você quer entrar.
        <template #actions>
          <router-link v-if="auth.isAuth" class="vc-btn vc-btn--ghost" :to="dashboardTarget">Voltar ao dashboard</router-link>
          <router-link v-else class="vc-btn vc-btn--ghost" :to="{ name: 'login' }">Voltar ao login</router-link>
        </template>
      </EmptyState>

      <template v-else>
        <template v-for="group in groupedProcesses" :key="group.roomName">
          <SectionTitle v-if="groupedProcesses.length > 1" lead="Sala" :title="group.roomName" />
          <div class="vc-grid">
            <article v-for="process in group.items" :key="process.publicToken" class="vc-card">
              <header class="vc-card__header" :style="{ background: process.tenantColor || 'var(--vc-purple)' }">
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
        </template>
      </template>

      <hr class="vc-divider" />
      <div class="vc-row">
        <template v-if="auth.isAuth">
          <router-link class="vc-btn vc-btn--ghost" :to="dashboardTarget">Voltar ao dashboard</router-link>
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'myApplications' }">Minhas candidaturas</router-link>
        </template>
        <router-link v-else class="vc-btn vc-btn--ghost" :to="{ name: 'login' }">Já sou da equipe: entrar</router-link>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import VernumLogo from '@/components/VernumLogo.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { publicRecruitment } from '@/services/api.js';
import { authStore } from '@/store/auth.js';

/*
 * Public list of processes with open applications. Reachable from the login screen by a visitor, and
 * from the dashboard by a member — the same page, with the way back changing to match who is reading.
 */
const auth = authStore();
const processes = ref([]);
const loading = ref(true);

/** Where "voltar" goes for somebody logged in: the home, or the waiting room when they have no team. */
const dashboardTarget = computed(() => ({ name: auth.hasNoTenant ? 'waiting' : 'home' }));

/** One group per room, named rooms first — see WaitingRoomView.vue for the same grouping. */
const groupedProcesses = computed(() => {
  const NO_ROOM = 'Sem sala definida';
  const groups = new Map();
  for (const process of processes.value) {
    const key = process.roomName || NO_ROOM;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(process);
  }
  const named = [...groups.keys()].filter((name) => name !== NO_ROOM).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const order = groups.has(NO_ROOM) ? [...named, NO_ROOM] : named;
  return order.map((roomName) => ({ roomName, items: groups.get(roomName) }));
});

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
