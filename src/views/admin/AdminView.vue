<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Admin Panel</h1>

      <AlertBanner variant="danger" title="Área sensível."
                   :aside="auth.activeTenantName || 'Sem equipe selecionada'">
        Você está acessando opções confidenciais. Não permaneça com login sem supervisão.
      </AlertBanner>

      <SectionTitle lead="Administração da" title="Plataforma" v-if="platformCards.length" />
      <div v-if="platformCards.length" class="vc-grid">
        <router-link v-for="card in platformCards" :key="card.label" :to="card.to" class="vc-card vc-card--action">
          <div class="vc-card__header">
            <span>{{ card.label }}</span>
            <AppIcon class="vc-card__icon" :name="card.icon" :size="17" />
          </div>
          <div class="vc-card__body"><p>{{ card.hint }}</p></div>
        </router-link>
      </div>

      <SectionTitle lead="Administração da" title="Equipe" />
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
import { computed } from 'vue';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';

/* Hub of the admin panel. Each card only shows up when the user has the permission. */
const auth = authStore();

const platformCards = computed(() => {
  const cards = [];
  if (auth.canPlatform('TENANT_VIEW_ALL') || auth.canPlatform('TENANT_CREATE')) {
    cards.push({
      label: 'Equipes',
      icon: 'flag',
      hint: 'Criar, alterar e desativar as equipes da plataforma.',
      to: { name: 'adminTenants' },
    });
  }
  return cards;
});

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
