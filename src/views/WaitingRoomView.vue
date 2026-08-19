<template>
  <main class="vc-page">
    <div class="vc-stack">
      <AlertBanner variant="warning" icon="⏳" title="Você ainda não faz parte de nenhuma equipe."
                   aside="Um administrador precisa te adicionar">
        Enquanto isso, você pode se candidatar a um dos processos seletivos abertos abaixo.
      </AlertBanner>

      <SectionTitle lead="Processos" title="Seletivos Abertos" />

      <p v-if="loading" class="vc-faint">Carregando processos...</p>

      <EmptyState v-else-if="!processes.length" title="Nenhum processo seletivo aberto">
        Assim que uma equipe abrir inscrições, o processo aparece aqui.
      </EmptyState>

      <div v-else class="vc-grid">
        <article v-for="process in processes" :key="process.publicToken" class="vc-card">
          <div class="vc-card__header" :style="{ background: process.tenantColor || '#8864AE' }">
            <span>{{ process.tenantName }}</span>
            <span v-if="process.tenantTeamNumber" class="vc-card__icon">#{{ process.tenantTeamNumber }}</span>
          </div>
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
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'myApplications' }">
          Minhas candidaturas
        </router-link>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'profile' }">Meu perfil</router-link>
        <span class="vc-spacer"></span>
        <button class="vc-btn vc-btn--ghost" type="button" @click="reload">Verificar de novo</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import { publicRecruitment } from '@/services/api.js';
import { authStore } from '@/store/auth.js';

/*
 * Where a logged user without any team lands. Instead of a dead end it shows the public
 * selection processes that are open, so the person has something to do.
 */
const auth = authStore();
const router = useRouter();
const processes = ref([]);
const loading = ref(true);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const { data } = await publicRecruitment.open();
    processes.value = data;
  } catch (error) {
    processes.value = [];
  } finally {
    loading.value = false;
  }
}

/** Asks the server again: an administrator may have added the user to a team meanwhile. */
async function reload() {
  await auth.loadMe();
  if (auth.memberships.length) {
    router.push({ name: auth.activeTenantId ? 'home' : 'chooseTenant' });
    return;
  }
  await load();
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>
