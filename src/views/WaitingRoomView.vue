<template>
  <main class="vc-page">
    <div class="vc-stack">
      <!-- Somebody with a team came by choice; the warning is for whoever has nowhere else to go. -->
      <AlertBanner v-if="hasTeams" variant="info" icon="userPlus" title="Processos seletivos abertos">
        Equipes com inscrições abertas agora. Você pode se candidatar a outra equipe sem sair da sua.
      </AlertBanner>
      <AlertBanner v-else variant="warning" icon="clock" title="Você ainda não faz parte de nenhuma equipe."
                   aside="Um administrador precisa te adicionar">
        Enquanto isso, você pode se candidatar a um dos processos seletivos abertos abaixo.
      </AlertBanner>

      <SectionTitle lead="Processos" title="Seletivos Abertos" />

      <p v-if="loading" class="vc-faint">Carregando processos...</p>

      <EmptyState v-else-if="!processes.length" title="Nenhum processo seletivo aberto">
        Assim que uma equipe abrir inscrições, o processo aparece aqui.
      </EmptyState>

      <template v-else>
        <template v-for="group in groupedProcesses" :key="group.roomName">
          <SectionTitle v-if="groupedProcesses.length > 1" lead="Sala" :title="group.roomName" />
          <div class="vc-grid">
            <article v-for="process in group.items" :key="process.publicToken" class="vc-card">
              <div class="vc-card__header" :style="{ background: process.tenantColor || 'var(--vc-purple)' }">
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
        </template>
      </template>

      <hr class="vc-divider" />

      <div class="vc-row">
        <router-link v-if="hasTeams" class="vc-btn vc-btn--ghost" :to="dashboardTarget">Voltar ao dashboard</router-link>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'myApplications' }">
          Minhas candidaturas
        </router-link>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'profile' }">Meu perfil</router-link>
        <span class="vc-spacer"></span>
        <button v-if="!hasTeams" class="vc-btn vc-btn--ghost" type="button" @click="reload">Verificar de novo</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import { publicRecruitment } from '@/services/api.js';
import { authStore } from '@/store/auth.js';

/*
 * Where a logged user without any team lands. Instead of a dead end it shows the public
 * selection processes that are open, so the person has something to do.
 *
 * A member of some team can open it too (the profile links here): for them it is just the list, with
 * a way back to the dashboard and no warning about not belonging anywhere.
 */
const auth = authStore();
const router = useRouter();
const processes = ref([]);
const loading = ref(true);

const hasTeams = computed(() => auth.memberships.length > 0);
const dashboardTarget = computed(() => ({ name: auth.activeTenantId ? 'home' : 'chooseTenant' }));

/**
 * One group per room — "Sala São Paulo", "Sala Rio de Janeiro" — named rooms first in alphabetical
 * order, with whatever team never joined one grouped last. A single group skips the heading: most
 * deployments never set up rooms at all, and a lone "Sem sala definida" label would say nothing.
 */
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
