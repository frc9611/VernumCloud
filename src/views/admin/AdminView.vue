<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Admin Panel</h1>

      <AlertBanner variant="danger" title="Área sensível."
                   :aside="auth.activeTenantName || 'Sem equipe selecionada'">
        Você está acessando opções confidenciais. Não permaneça com login sem supervisão.
      </AlertBanner>

      <!-- ------------------------------------------------------------- platform -->
      <!-- Set apart from the team cards: what happens here reaches every team, not the one open. -->
      <section v-if="showPlatform" class="platform">
        <SectionTitle lead="Administração da" title="Plataforma">
          <template #actions>
            <span class="vc-chip vc-chip--danger">
              <AppIcon name="shield" :size="14" />
              Administração Vernum
            </span>
          </template>
        </SectionTitle>

        <div v-if="overview" class="vc-metrics">
          <router-link class="vc-metric" :to="{ name: 'adminTenants' }">
            <div class="vc-metric__head"><span>Equipes</span><AppIcon name="flag" :size="16" /></div>
            <div class="vc-metric__value">{{ teamsCount }}</div>
            <div class="vc-metric__foot">
              {{ activeTeamsCount }} ativas · sem contar a administradora
            </div>
          </router-link>
          <router-link class="vc-metric" :to="{ name: 'adminUsers' }">
            <div class="vc-metric__head"><span>Usuários</span><AppIcon name="users" :size="16" /></div>
            <div class="vc-metric__value">{{ overview.users }}</div>
            <div class="vc-metric__foot">
              {{ overview.activeUsers }} ativos
              <template v-if="inactiveUsers"> · {{ inactiveUsers }} desativados</template>
            </div>
          </router-link>
          <router-link class="vc-metric" :to="{ name: 'adminUsers', query: { filtro: 'senha' } }">
            <div class="vc-metric__head"><span>Senhas provisórias</span><AppIcon name="key" :size="16" /></div>
            <div :class="['vc-metric__value', overview.usersMustChangePassword ? 'vc-metric__value--warning' : '']">
              {{ overview.usersMustChangePassword }}
            </div>
            <div class="vc-metric__foot">contas esperando a primeira troca de senha</div>
          </router-link>
          <div class="vc-metric">
            <div class="vc-metric__head"><span>Na sala agora</span><AppIcon name="clock" :size="16" /></div>
            <div class="vc-metric__value">{{ overview.inRoomNow }}</div>
            <div class="vc-metric__foot">pessoas com estada aberta, em todas as equipes</div>
          </div>
        </div>
        <p v-else-if="overviewFailed" class="vc-faint platform__note">
          Não deu para carregar os números da plataforma agora.
        </p>

        <div v-if="platformCards.length" class="vc-grid">
          <router-link v-for="card in platformCards" :key="card.label" :to="card.to" class="vc-card vc-card--action">
            <div class="vc-card__header">
              <span>{{ card.label }}</span>
              <AppIcon class="vc-card__icon" :name="card.icon" :size="17" />
            </div>
            <div class="vc-card__body"><p>{{ card.hint }}</p></div>
          </router-link>
        </div>
      </section>

      <!-- ----------------------------------------------------------- open team -->
      <SectionTitle lead="Administração da" title="Equipe aberta">
        <template #actions>
          <span v-if="auth.activeTenantName" class="vc-chip vc-chip--purple">{{ auth.activeTenantName }}</span>
        </template>
      </SectionTitle>
      <EmptyState v-if="!teamCards.length" title="Nada para administrar aqui">
        Você não tem permissões de administração nesta equipe.
      </EmptyState>
      <div v-else class="vc-grid">
        <router-link v-for="card in teamCards" :key="card.label" :to="card.to" class="vc-card vc-card--action">
          <div class="vc-card__header">
            <span>{{ card.label }}</span>
            <AppIcon class="vc-card__icon" :name="card.icon" :size="17" />
          </div>
          <div class="vc-card__body"><p>{{ card.hint }}</p></div>
        </router-link>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { platform } from '@/services/api.js';

/*
 * Hub of the admin panel. Each card only shows up when the user has the permission.
 *
 * The platform block on top belongs to the administrator team, whatever team is open: its numbers
 * come from /platform/overview and its cards lead to the screens that reach every team. The team
 * cards below are about the team open, as before.
 */
const auth = authStore();

const overview = ref(null);
const overviewFailed = ref(false);

const canSeePlatform = computed(() => auth.platformAdmin || auth.canPlatform('TENANT_VIEW_ALL'));
const showPlatform = computed(() => canSeePlatform.value || platformCards.value.length > 0);

/* The overview counts the administrator tenant too (same rows as GET /tenants); the strip talks about teams. */
const teamsCount = computed(() => Math.max(0, (overview.value?.tenants ?? 0) - 1));
const activeTeamsCount = computed(() => Math.max(0, (overview.value?.activeTenants ?? 0) - 1));
const inactiveUsers = computed(() =>
  Math.max(0, (overview.value?.users ?? 0) - (overview.value?.activeUsers ?? 0)),
);

const platformCards = computed(() => {
  const cards = [];
  if (auth.canPlatform('TENANT_VIEW_ALL') || auth.canPlatform('TENANT_CREATE')) {
    cards.push({
      label: 'Equipes',
      icon: 'flag',
      hint: 'Criar, alterar e desativar as equipes da plataforma — e cuidar de membros e recursos de qualquer uma.',
      to: { name: 'adminTenants' },
    });
  }
  if (auth.canPlatform('TENANT_VIEW_ALL')) {
    cards.push({
      label: 'Usuários',
      icon: 'users',
      hint: 'Todas as contas: em que equipes cada pessoa está, senha provisória, desativar e apagar.',
      to: { name: 'adminUsers' },
    });
  }
  if (auth.canPlatform('TENANT_UPDATE')) {
    cards.push({
      label: 'Salas',
      icon: 'mapPin',
      hint: 'Agrupe equipes que dividem o mesmo espaço físico — a presença usa isso para saber que uma pessoa não está em duas salas ao mesmo tempo.',
      to: { name: 'adminRooms' },
    });
  }
  return cards;
});

onMounted(loadOverview);
watch(() => auth.platformPermissions, loadOverview);

async function loadOverview() {
  if (!auth.canPlatform('TENANT_VIEW_ALL')) {
    overview.value = null;
    return;
  }
  try {
    const { data } = await platform.overview();
    overview.value = data;
    overviewFailed.value = false;
  } catch (error) {
    //The hub still works without the numbers: the cards are the point of the screen
    overview.value = null;
    overviewFailed.value = true;
  }
}

const teamCards = computed(() => {
  const cards = [];
  if (auth.can('TENANT_MANAGE')) {
    cards.push({
      label: 'Recursos da equipe',
      icon: 'sliders',
      hint: 'Categoria de competição, quais partes da plataforma a equipe usa e os perfis padrão.',
      to: { name: 'adminFeatures' },
    });
  }
  if (auth.can('MEMBER_VIEW')) {
    cards.push({
      label: 'Membros e permissões',
      icon: 'users',
      hint: 'Cargos na equipe, permissões individuais e entrada de novas pessoas.',
      to: { name: 'adminMembers' },
    });
  }
  if (auth.can('DIVISION_VIEW')) {
    cards.push({
      label: 'Divisões e subdivisões',
      icon: 'divisions',
      hint: 'Montar a árvore de divisões e definir quem lidera cada uma.',
      to: { name: 'adminDivisions' },
    });
  }
  if (auth.featureOn('RECRUITMENT') && auth.can('RECRUITMENT_VIEW')) {
    cards.push({
      label: 'Processos seletivos',
      icon: 'clipboard',
      hint: 'Link público de inscrição, etapas e painel de candidatos.',
      to: { name: 'adminRecruitment' },
    });
  }
  if (auth.featureOn('ATTENDANCE') && auth.canAny('ATTENDANCE_VIEW', 'ATTENDANCE_MANAGE')) {
    cards.push({
      label: 'Presença',
      icon: 'clock',
      hint: 'Quem está na sala, o ranking e o histórico de estadas — com o fecho das que ficaram abertas.',
      to: { name: 'attendance' },
    });
  }
  if (auth.featureOn('ATTENDANCE') && auth.can('RFID_MANAGE')) {
    cards.push({
      label: 'Cartões RFID',
      icon: 'card',
      hint: 'Os cartões que a equipe usa nos leitores da sala, e a revogação de um que se perdeu.',
      to: { name: 'adminRfid' },
    });
  }
  if (auth.featureOn('TRIPS') && auth.can('TRIP_VIEW')) {
    cards.push({
      label: 'Viagens',
      icon: 'plane',
      hint: 'Eventos, documentos pedidos, quem foi convidado e quem já respondeu.',
      to: { name: 'trips' },
    });
  }
  if (auth.featureOn('TASKS') && auth.can('TASK_MANAGE')) {
    cards.push({
      label: 'Demandas',
      icon: 'kanban',
      hint: 'O quadro da equipe: prazo, responsáveis, prioridade e critério de conclusão.',
      to: { name: 'tasks' },
    });
  }
  if (auth.featureOn('RISKS') && auth.can('RISK_MANAGE')) {
    cards.push({
      label: 'Riscos',
      icon: 'alert',
      hint: 'Probabilidade, impacto, responsável e mitigação — com o crítico marcado sozinho.',
      to: { name: 'risks' },
    });
  }
  if (auth.featureOn('PERFORMANCE') && auth.can('PERFORMANCE_MANAGE')) {
    cards.push({
      label: 'Performance',
      icon: 'target',
      hint: 'Runs, testes, readiness por área e o cartão de prontidão da equipe.',
      to: { name: 'performance' },
    });
  }
  if (auth.featureOn('MEMBER_DEVELOPMENT') && auth.can('DEVELOPMENT_VIEW')) {
    cards.push({
      label: 'Desenvolvimento das pessoas',
      icon: 'seedling',
      hint: 'Autonomia, competências e frequência — lançada e a que o registro de presença mostra.',
      to: { name: 'development' },
    });
  }
  if (auth.featureOn('JOURNAL') && auth.can('JOURNAL_VIEW')) {
    cards.push({
      label: 'Caderno do técnico',
      icon: 'notebook',
      hint: 'Decisões, erros, aprendizados e feedbacks de quem conduz a equipe.',
      to: { name: 'journal' },
    });
  }
  if (auth.featureOn('APPS') && auth.can('APP_MANAGE')) {
    cards.push({
      label: 'Apps da equipe',
      icon: 'link',
      hint: 'Cadastrar ferramentas, ligar o login pelo Vernum e instalar apps de outras equipes.',
      to: { name: 'adminApps' },
    });
  }
  if (auth.featureOn('APPS') && auth.can('API_KEY_MANAGE')) {
    cards.push({
      label: 'Chaves de API',
      icon: 'key',
      hint: 'Credenciais para um programa falar com a API sem abrir o dashboard.',
      to: { name: 'adminApiKeys' },
    });
  }
  if (auth.featureOn('EVENTS') && auth.can('EVENT_VIEW')) {
    cards.push({
      label: 'Eventos e premiações',
      icon: 'award',
      hint: 'Onde a equipe foi, quem foi e o que trouxe de volta — cada participação e prêmio vira badge no perfil.',
      to: { name: 'adminEvents' },
    });
  }
  if (auth.featureOn('LANDING_PAGE') && auth.can('PAGE_MANAGE')) {
    cards.push({
      label: 'Página pública',
      icon: 'globe',
      hint: 'Modelo, apresentação, contato e publicações da equipe na internet.',
      to: { name: 'adminPage' },
    });
  }
  if (auth.featureOn('LIVE_WALL') && auth.can('WALL_MANAGE')) {
    cards.push({
      label: 'Mural ao vivo',
      icon: 'monitor',
      hint: 'A tela de TV da sala: o link da televisão, o cronômetro, o que aparece e os eventos que tomam a tela.',
      to: { name: 'adminWall' },
    });
  }
  if (auth.can('MEMBER_INVITE')) {
    cards.push({
      label: 'Cadastrar usuário',
      icon: 'userPlus',
      hint: 'Criar uma conta nova e já colocar a pessoa na equipe.',
      to: { name: 'createUser' },
    });
  }
  if (auth.featureOn('CLOUD')) {
    cards.push({
      label: 'Pedidos de acesso',
      icon: 'key',
      hint: 'Responder quem pediu acesso a uma pasta ou arquivo.',
      to: { name: 'accessRequests' },
    });
  }
  return cards;
});
</script>

<style scoped>
/* The platform block is marked by the red edge of the administration, whatever palette the team paints. */
.platform {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 18px;
  border: 1px solid var(--vc-border-strong);
  border-left: 4px solid var(--vc-danger-strong);
  border-radius: var(--vc-radius-lg);
  background: var(--vc-surface-muted);
}

.platform .vc-section-title {
  margin-bottom: 0;
}

.platform__note {
  margin: 0;
}
</style>
