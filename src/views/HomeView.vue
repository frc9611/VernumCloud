<template>
  <main class="vc-page">
    <TabBar v-model="tab" :tabs="tabs">
      <template #context>
        <span class="vc-chip">{{ today }}</span>
        <span class="vc-chip">{{ auth.activeRoleLabel }}</span>
        <span class="vc-chip">{{ auth.getName }}</span>
        <span
          v-for="division in auth.activeDivisions.slice(0, 2)"
          :key="division.divisionMembershipId"
          class="vc-chip vc-chip--purple"
        >
          {{ division.divisionVisibleName }}
        </span>
      </template>
    </TabBar>

    <!-- ------------------------------------------------------------- home -->
    <div v-if="tab === 'home'" class="vc-stack">
      <AlertBanner variant="success" icon="home" title="Bem-vindo(a)!" :aside="auth.activeTenantName">
        {{ auth.getName }}
      </AlertBanner>


      <!-- The command center: the few numbers that decide what somebody does next. -->
      <template v-if="dashboard">
        <SectionTitle lead="Central de" title="Comando">
          <template #actions>
            <span v-if="dashboard.competitionCategory !== 'NONE'" class="vc-chip vc-chip--purple">
              {{ dashboard.competitionCategoryLabel }}
            </span>
            <router-link v-if="auth.can('PERFORMANCE_VIEW') && auth.featureOn('PERFORMANCE')"
                         class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'performance' }">
              Performance
            </router-link>
          </template>
        </SectionTitle>

        <div class="vc-metrics">
          <div v-if="dashboard.readiness" class="vc-metric">
            <div class="vc-metric__head"><span>Prontidão da equipe</span><AppIcon name="gauge" :size="16" /></div>
            <div class="vc-metric__value">{{ dashboard.readiness.readinessScore ?? '—' }}</div>
            <div class="vc-metric__foot">
              {{ dashboard.readiness.nextMilestone || 'próximo marco a definir' }}
            </div>
          </div>
          <router-link v-if="auth.featureOn('TASKS') && auth.can('TASK_VIEW')" class="vc-metric"
                       :to="{ name: 'tasks' }">
            <div class="vc-metric__head"><span>Demandas abertas</span><AppIcon name="kanban" :size="16" /></div>
            <div :class="['vc-metric__value', dashboard.metrics.blockedTasks ? 'vc-metric__value--danger' : '']">
              {{ dashboard.metrics.openTasks }}
            </div>
            <div class="vc-metric__foot">
              {{ dashboard.metrics.blockedTasks }} bloqueada(s) · {{ dashboard.metrics.overdueTasks }} atrasada(s)
            </div>
          </router-link>
          <router-link v-if="auth.featureOn('RISKS') && auth.can('RISK_VIEW')" class="vc-metric"
                       :to="{ name: 'risks' }">
            <div class="vc-metric__head"><span>Riscos críticos</span><AppIcon name="alert" :size="16" /></div>
            <div :class="['vc-metric__value', dashboard.metrics.criticalRisks ? 'vc-metric__value--danger' : '']">
              {{ dashboard.metrics.criticalRisks }}
            </div>
            <div class="vc-metric__foot">{{ dashboard.metrics.openRisks }} risco(s) em aberto</div>
          </router-link>
          <router-link v-if="dashboard.metrics.frequencyAlerts !== null" class="vc-metric"
                       :to="{ name: 'development' }">
            <div class="vc-metric__head"><span>Frequência em atenção</span><AppIcon name="users" :size="16" /></div>
            <div :class="['vc-metric__value', dashboard.metrics.frequencyAlerts ? 'vc-metric__value--warning' : '']">
              {{ dashboard.metrics.frequencyAlerts }}
            </div>
            <div class="vc-metric__foot">
              abaixo de {{ dashboard.metrics.attendanceThreshold }}% ·
              {{ dashboard.metrics.frequencyUnknown }} a validar
            </div>
          </router-link>
          <div v-if="dashboard.metrics.reliability !== null" class="vc-metric">
            <div class="vc-metric__head"><span>Confiabilidade</span><AppIcon name="target" :size="16" /></div>
            <div class="vc-metric__value">{{ dashboard.metrics.reliability }}%</div>
            <div class="vc-metric__foot">{{ dashboard.metrics.runCount }} registro(s) medido(s)</div>
          </div>
        </div>

        <div class="vc-split">
          <PanelCard title="Atenção necessária" icon="alert" muted>
            <div v-if="dashboard.attention.length" class="vc-list">
              <router-link v-for="(item, index) in dashboard.attention" :key="index"
                           class="vc-list__item" :to="item.link">
                <span class="vc-dot" :style="{ background: item.severity === 'DANGER'
                  ? 'var(--vc-danger-text)' : 'var(--vc-warning-strong)' }"></span>
                <span class="vc-list__text">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.detail }}</span>
                </span>
                <span class="vc-list__aside">abrir ›</span>
              </router-link>
            </div>
            <p v-else class="vc-faint" style="margin: 0">Nada pedindo decisão agora.</p>
          </PanelCard>

          <PanelCard title="Suas demandas" icon="kanban" muted>
            <div v-if="dashboard.myTasks.length" class="vc-list">
              <router-link v-for="task in dashboard.myTasks.slice(0, 6)" :key="task.taskId"
                           class="vc-list__item" :to="{ name: 'tasks' }">
                <span class="vc-list__text">
                  <strong>{{ task.title }}</strong>
                  <span>{{ task.statusLabel }} · {{ task.dueLabel }}</span>
                </span>
              </router-link>
            </div>
            <p v-else class="vc-faint" style="margin: 0">Nenhuma demanda vinculada a você.</p>
          </PanelCard>
        </div>

        <PanelCard v-if="dashboard.reminders.length" title="Vencendo agora" icon="clock" muted>
          <p class="vc-faint" style="margin-top: 0">
            Demandas que vencem em até {{ dashboard.metrics.reminderDays }} dia(s), mais as atrasadas.
            O lembrete diário alcança quem está vinculado a elas.
          </p>
          <div class="vc-list">
            <router-link v-for="task in dashboard.reminders.slice(0, 6)" :key="task.taskId"
                         class="vc-list__item" :to="{ name: 'tasks' }">
              <span class="vc-dot" :style="{ background: task.overdue
                ? 'var(--vc-danger-text)' : 'var(--vc-warning-strong)' }"></span>
              <span class="vc-list__text">
                <strong>{{ task.title }}</strong>
                <span>{{ task.ownerLabel || 'sem responsável' }} · {{ task.dueLabel }}</span>
              </span>
            </router-link>
          </div>
        </PanelCard>
      </template>

      <SectionTitle lead="Atalhos" title="da Equipe" />
      <div class="vc-grid">
        <router-link
          v-for="shortcut in shortcuts"
          :key="shortcut.label"
          :to="shortcut.to"
          class="vc-card vc-card--action"
        >
          <div class="vc-card__header">
            <span>{{ shortcut.label }}</span>
            <AppIcon class="vc-card__icon" :name="shortcut.icon" :size="17" />
          </div>
          <div class="vc-card__body">
            <p>{{ shortcut.hint }}</p>
          </div>
        </router-link>
      </div>

      <TripCarousel />

      <AnnouncementBoard />

      <div v-if="pendingAccessRequests.length" class="vc-stack">
        <SectionTitle lead="Pedidos" title="de Acesso">
          <template #actions>
            <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'accessRequests' }">
              Ver todos
            </router-link>
          </template>
        </SectionTitle>
        <div class="vc-table-wrap">
          <table class="vc-table">
            <thead>
              <tr><th>Quem pediu</th><th>Item</th><th>Nível</th><th>Quando</th></tr>
            </thead>
            <tbody>
              <tr v-for="request in pendingAccessRequests.slice(0, 5)" :key="request.accessRequestId">
                <td>{{ request.requesterName }}</td>
                <td>{{ request.targetName }}</td>
                <td>{{ request.requestedLevel }}</td>
                <td class="vc-faint">{{ formatWhen(request.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------- apps -->
    <div v-else-if="tab === 'apps'" class="vc-stack">
      <SectionTitle lead="Apps" title="da Equipe">
        <template #actions>
          <router-link v-if="auth.can('APP_MANAGE')" class="vc-btn vc-btn--ghost vc-btn--small"
                       :to="{ name: 'adminApps' }">
            Cadastrar apps
          </router-link>
        </template>
      </SectionTitle>
      <p class="vc-faint">Ferramentas que a equipe usa no dia a dia.</p>

      <div class="vc-grid">
        <PanelCard v-for="app in apps" :key="app.appId" :title="app.visibleName"
                   :icon="app.icon || 'link'" :color="app.color">
          <p>{{ app.description || 'Sem descrição.' }}</p>
          <div v-if="app.url" class="vc-input-group">
            <input class="vc-input" readonly :value="app.url" />
            <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(app.url)">
              <AppIcon name="copy" :size="16" />
            </button>
          </div>
          <div class="vc-row">
            <a v-if="app.url" class="vc-btn" :href="app.url" target="_blank" rel="noopener">Abrir</a>
            <span v-if="app.ssoEnabled" class="vc-chip vc-chip--purple">entra com o Vernum</span>
            <span v-if="!app.ownedByThisTenant" class="vc-chip">de {{ app.ownerTenantName }}</span>
          </div>
        </PanelCard>

        <PanelCard title="Vernum Cloud" icon="cloud">
          <p>Os arquivos da equipe, com permissão por pessoa e por divisão.</p>
          <router-link class="vc-btn" :to="{ name: 'cloud' }">Abrir arquivos</router-link>
        </PanelCard>
      </div>

      <EmptyState v-if="!apps.length" title="Nenhum app cadastrado">
        {{ auth.can('APP_MANAGE')
          ? 'Cadastre o Discord, o quiosque de presença ou qualquer ferramenta da equipe.'
          : 'Quem administra a equipe pode cadastrar as ferramentas que vocês usam.' }}
      </EmptyState>
    </div>

    <!-- --------------------------------------------------------- scouting -->
    <div v-else class="vc-stack">
      <AlertBanner variant="warning" title="Scouting ainda não implementado"
                   aside="Próxima etapa do desenvolvimento">
        A tela está reservada e segue o mesmo modelo das outras: abas, banners e cards.
      </AlertBanner>

      <SectionTitle lead="On-Cloud" title="Scouting" />
      <div class="vc-split">
        <div class="vc-grid">
          <PanelCard title="Criar uma Scout Entry">
            <p>Todos os membros podem analisar o desempenho de uma equipe e seu robô durante uma partida.</p>
            <button class="vc-btn" type="button" disabled>Scoutar</button>
          </PanelCard>
          <PanelCard title="Criar uma Scouting Analysis">
            <p>Com os dados dos outros times em mãos é possível criar uma análise para determinar o parceiro de aliança ideal.</p>
            <button class="vc-btn" type="button" disabled>Analisar</button>
          </PanelCard>
        </div>
        <PanelCard title="My Last Scouts" icon="chart">
          <p class="vc-faint" style="margin: 0">Sem dados enquanto o scouting não existir no servidor.</p>
        </PanelCard>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import TabBar from '@/components/TabBar.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import AnnouncementBoard from '@/components/AnnouncementBoard.vue';
import TripCarousel from '@/components/TripCarousel.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import PanelCard from '@/components/PanelCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { apps as appsApi, cloud, teamDashboard } from '@/services/api.js';

const auth = authStore();
const toast = useToast();

const tab = ref('home');
const pendingAccessRequests = ref([]);
const apps = ref([]);
const dashboard = ref(null);

const tabs = computed(() => {
  const items = [{ key: 'home', label: 'Home' }];
  if (auth.featureOn('APPS')) items.push({ key: 'apps', label: 'Apps' });
  items.push({ key: 'scouting', label: 'Scouting', hint: 'Ainda não implementado' });
  return items;
});

const today = computed(() => new Date().toLocaleDateString('pt-BR'));

/* Only the shortcuts the user is actually allowed to open. */
const shortcuts = computed(() => {
  const items = [];
  if (auth.featureOn('CLOUD')) {
    items.push({ label: 'Arquivos', icon: 'folder', hint: 'Pastas e arquivos da equipe, com compartilhamento.', to: { name: 'cloud' } });
  }
  if (auth.can('MEMBER_VIEW')) {
    items.push({ label: 'Equipe', icon: 'users', hint: 'Todos os membros e seus cargos.', to: { name: 'teamMembers' } });
  }
  if (auth.can('DIVISION_VIEW')) {
    items.push({ label: 'Divisões', icon: 'divisions', hint: 'Divisões, subdivisões e quem está em cada uma.', to: { name: 'divisions' } });
  }
  if (auth.featureOn('TASKS') && auth.can('TASK_VIEW')) {
    items.push({ label: 'Demandas', icon: 'kanban', hint: 'O quadro da equipe: prazo, responsáveis e critério de conclusão.', to: { name: 'tasks' } });
  }
  if (auth.featureOn('RISKS') && auth.can('RISK_VIEW')) {
    items.push({ label: 'Riscos', icon: 'alert', hint: 'Probabilidade, impacto, responsável e mitigação.', to: { name: 'risks' } });
  }
  if (auth.featureOn('PERFORMANCE') && auth.can('PERFORMANCE_VIEW')) {
    items.push({ label: 'Performance', icon: 'target', hint: 'Runs, testes, readiness por área e a prontidão da equipe.', to: { name: 'performance' } });
  }
  if (auth.featureOn('MEMBER_DEVELOPMENT')) {
    items.push({ label: 'Desenvolvimento', icon: 'seedling', hint: 'Autonomia, competências e frequência de cada pessoa.', to: { name: 'development' } });
  }
  if (auth.featureOn('EVALUATIONS')) {
    items.push({ label: 'Avaliações', icon: 'star', hint: 'Ciclos de avaliação individual e a próxima competência.', to: { name: 'evaluations' } });
  }
  if (auth.featureOn('JOURNAL') && auth.can('JOURNAL_VIEW')) {
    items.push({ label: 'Caderno do Técnico', icon: 'notebook', hint: 'Decisões, erros, aprendizados e feedbacks.', to: { name: 'journal' } });
  }
  if (auth.featureOn('RECRUITMENT') && auth.can('RECRUITMENT_VIEW')) {
    items.push({ label: 'Processos Seletivos', icon: 'clipboard', hint: 'Inscrições, etapas e candidatos.', to: { name: 'adminRecruitment' } });
  }
  if (auth.featureOn('TRIPS') && auth.can('TRIP_VIEW')) {
    items.push({ label: 'Viagens', icon: 'plane', hint: 'Eventos, documentos pedidos e quem já respondeu.', to: { name: 'trips' } });
  }
  if (auth.featureOn('ATTENDANCE')) {
    items.push({ label: 'Presença', icon: 'clock', hint: 'Quem está na sala, o ranking e o seu histórico de presença.', to: { name: 'attendance' } });
  }
  if (auth.featureOn('CLOUD')) {
    items.push({ label: 'Compartilhados comigo', icon: 'share', hint: 'O que outras equipes compartilharam com você.', to: { name: 'sharedWithMe' } });
  }
  return items;
});

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  /*
   * One call for the whole command center, already cut to what this person may read: a section they
   * cannot see comes back empty instead of as a 403 that would replace the first screen after login.
   */
  try {
    const { data } = await teamDashboard.get(auth.activeTenantId);
    dashboard.value = data;
  } catch (error) {
    dashboard.value = null;
  }
  try {
    const { data } = await cloud.accessRequests();
    pendingAccessRequests.value = data;
  } catch (error) {
    pendingAccessRequests.value = [];
  }
  try {
    const { data } = await appsApi.list(auth.activeTenantId);
    apps.value = data;
  } catch (error) {
    apps.value = [];
  }
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Link copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
</script>
