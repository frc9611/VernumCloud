<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Admin Panel</h1>

      <AlertBanner variant="danger" icon="!" title="Área sensível."
                   :aside="auth.activeTenantName || 'Sem equipe selecionada'">
        Você está acessando opções confidenciais. Não permaneça com login sem supervisão.
      </AlertBanner>

      <SectionTitle lead="Administração da" title="Plataforma" v-if="platformCards.length" />
      <div v-if="platformCards.length" class="vc-grid">
        <router-link v-for="card in platformCards" :key="card.label" :to="card.to" class="vc-card vc-card--action">
          <div class="vc-card__header">
            <span>{{ card.label }}</span>
            <span class="vc-card__icon" aria-hidden="true">{{ card.icon }}</span>
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
            <span class="vc-card__icon" aria-hidden="true">{{ card.icon }}</span>
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
import { authStore } from '@/store/auth.js';

/* Hub of the admin panel. Each card only shows up when the user has the permission. */
const auth = authStore();

const platformCards = computed(() => {
  const cards = [];
  if (auth.canPlatform('TENANT_VIEW_ALL') || auth.canPlatform('TENANT_CREATE')) {
    cards.push({
      label: 'Equipes',
      icon: '🏳',
      hint: 'Criar, alterar e desativar as equipes da plataforma.',
      to: { name: 'adminTenants' },
    });
  }
  return cards;
});

const teamCards = computed(() => {
  const cards = [];
  if (auth.can('MEMBER_VIEW')) {
    cards.push({
      label: 'Membros e permissões',
      icon: '👥',
      hint: 'Cargos na equipe, permissões individuais e entrada de novas pessoas.',
      to: { name: 'adminMembers' },
    });
  }
  if (auth.can('DIVISION_VIEW')) {
    cards.push({
      label: 'Divisões e subdivisões',
      icon: '🧩',
      hint: 'Montar a árvore de divisões e definir quem lidera cada uma.',
      to: { name: 'adminDivisions' },
    });
  }
  if (auth.can('RECRUITMENT_VIEW')) {
    cards.push({
      label: 'Processos seletivos',
      icon: '📝',
      hint: 'Link público de inscrição, etapas e painel de candidatos.',
      to: { name: 'adminRecruitment' },
    });
  }
  if (auth.can('MEMBER_INVITE')) {
    cards.push({
      label: 'Cadastrar usuário',
      icon: '➕',
      hint: 'Criar uma conta nova e já colocar a pessoa na equipe.',
      to: { name: 'createUser' },
    });
  }
  cards.push({
    label: 'Pedidos de acesso',
    icon: '🔐',
    hint: 'Responder quem pediu acesso a uma pasta ou arquivo.',
    to: { name: 'accessRequests' },
  });
  return cards;
});
</script>
