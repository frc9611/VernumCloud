<template>
  <main class="vc-page">
    <div class="vc-stack">
      <!-- Somebody with a team came by choice; the warning is for whoever has nowhere else to go. -->
      <!-- ------------------------------------------------ a team this person asked for -->
      <template v-if="pendingSignup">
        <AlertBanner v-if="pendingSignup.status === 'PENDING'" variant="info" icon="clock"
                     title="Sua solicitação de equipe está em análise.">
          Assim que a plataforma decidir, a equipe aparece aqui e você entra direto nela.
        </AlertBanner>
        <AlertBanner v-else-if="pendingSignup.status === 'REJECTED'" variant="warning" icon="alert"
                     title="Sua solicitação de equipe não foi aprovada.">
          Leia a observação abaixo, ajuste o que for preciso e envie de novo.
        </AlertBanner>

        <article class="vc-card">
          <div class="vc-card__header" :style="{ background: pendingSignup.color || 'var(--vc-purple)' }">
            <span>{{ pendingSignup.visibleName }}</span>
            <span v-if="pendingSignup.teamNumber" class="vc-card__icon">#{{ pendingSignup.teamNumber }}</span>
          </div>
          <div class="vc-card__body vc-stack">
            <div class="waiting__facts">
              <span :class="['vc-chip', statusChip]">{{ pendingSignup.statusLabel }}</span>
              <span v-if="pendingSignup.competitionCategoryLabel" class="vc-chip">
                {{ pendingSignup.competitionCategoryLabel }}
              </span>
              <span v-if="pendingSignup.roomName" class="vc-chip">{{ pendingSignup.roomName }}</span>
              <span v-else-if="pendingSignup.requestedRoomName" class="vc-chip vc-chip--info">
                Sala nova: {{ pendingSignup.requestedRoomName }}
              </span>
            </div>
            <p class="vc-small vc-muted" style="margin: 0">
              Enviada em {{ formatDate(pendingSignup.createdAt) }} · endereço {{ pendingSignup.slug }}
            </p>
            <div v-if="pendingSignup.reviewNote" class="vc-callout">
              <strong>Observação de quem analisou</strong>
              <p style="margin: 4px 0 0">{{ pendingSignup.reviewNote }}</p>
              <p v-if="pendingSignup.reviewedByName" class="vc-small vc-faint" style="margin: 6px 0 0">
                {{ pendingSignup.reviewedByName }}
                <template v-if="pendingSignup.reviewedAt"> · {{ formatDate(pendingSignup.reviewedAt) }}</template>
              </p>
            </div>
          </div>
          <div class="vc-card__footer">
            <span class="vc-spacer"></span>
            <router-link v-if="pendingSignup.status === 'REJECTED'" class="vc-btn vc-btn--small"
                         :to="{ name: 'teamSignup' }">
              Enviar de novo
            </router-link>
            <button v-else class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="reload">
              Verificar de novo
            </button>
          </div>
        </article>

        <hr class="vc-divider" />
      </template>

      <AlertBanner v-if="hasTeams" variant="info" icon="userPlus" title="Processos seletivos abertos">
        Equipes com inscrições abertas agora. Você pode se candidatar a outra equipe sem sair da sua.
      </AlertBanner>
      <AlertBanner v-else-if="!pendingSignup" variant="warning" icon="clock"
                   title="Você ainda não faz parte de nenhuma equipe."
                   aside="Um administrador precisa te adicionar">
        Enquanto isso, você pode se candidatar a um dos processos seletivos abertos abaixo, ou
        <router-link :to="{ name: 'teamSignup' }">cadastrar a sua equipe</router-link>.
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
import { publicRecruitment, teamSignup } from '@/services/api.js';
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
/* The newest request of this person, when they asked for a team of their own. */
const signupRequest = ref(null);

const hasTeams = computed(() => auth.memberships.length > 0);

/*
 * The request is only worth a card while it is still an answer the person is waiting for. Once the
 * team exists and they are in it, there is nothing to watch: the team itself is the answer, and a
 * card repeating it on the waiting screen is just something old left on the table.
 */
const pendingSignup = computed(() => {
  const request = signupRequest.value;
  if (!request) return null;
  if (request.status === 'APPROVED' && joined(request)) return null;
  return request;
});

const statusChip = computed(() => {
  if (!pendingSignup.value) return '';
  if (pendingSignup.value.status === 'APPROVED') return 'vc-chip--success';
  if (pendingSignup.value.status === 'REJECTED') return 'vc-chip--danger';
  return 'vc-chip--warning';
});

function joined(request) {
  return !!request.createdTenantId
    && auth.memberships.some((membership) => membership.tenant?.tenantId === request.createdTenantId);
}
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

onMounted(async () => {
  await Promise.all([load(), loadSignup()]);
});

/*
 * The request of this person, and the one case where this screen sends them away: an approved
 * request means the team exists, and the session was built before it did. Nothing pushes a logged
 * dashboard, so asking the server once here is what turns the approval into an open team.
 */
async function loadSignup() {
  if (!auth.isAuth) return;
  try {
    const { data } = await teamSignup.mine();
    signupRequest.value = data.length ? data[0] : null;
  } catch (error) {
    signupRequest.value = null;
    return;
  }
  if (signupRequest.value?.status !== 'APPROVED') return;
  //The session was built before the team existed, and nothing pushes a logged dashboard
  if (!joined(signupRequest.value)) await auth.loadMe();
  if (joined(signupRequest.value)) {
    router.push({ name: auth.activeTenantId ? 'home' : 'chooseTenant' });
  }
}

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
  await Promise.all([load(), loadSignup()]);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>

<style scoped>
.waiting__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
