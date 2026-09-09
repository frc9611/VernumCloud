<template>
  <div class="vc-stack">
    <SectionTitle lead="Apps" title="da Equipe">
      <template #actions>
        <router-link v-if="auth.can('APP_MANAGE')" class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'adminApps' }">
          Cadastrar apps
        </router-link>
      </template>
    </SectionTitle>
    <p class="vc-faint">Ferramentas que a equipe usa no dia a dia.</p>

    <div class="vc-grid">
      <PanelCard v-for="app in apps" :key="app.appId" :title="app.visibleName" :icon="app.icon || 'link'" :color="app.color">
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
</template>

<script setup>
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';

/* The Apps tab: the tools the team registered, plus the cloud itself. */
defineProps({
  apps: { type: Array, required: true },
});

const auth = authStore();
const toast = useToast();

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Link copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}
</script>
