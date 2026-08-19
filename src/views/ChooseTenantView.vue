<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div>
        <h1 class="vc-title vc-title--underlined">Escolha uma equipe</h1>
        <p class="vc-muted" style="margin: 10px 0 0">
          Você faz parte de {{ auth.memberships.length }} equipes. Cada uma tem suas próprias divisões,
          arquivos e permissões.
        </p>
      </div>

      <div class="vc-grid">
        <button
          v-for="membership in auth.memberships"
          :key="membership.membershipId"
          type="button"
          class="vc-card vc-card--action tenant-card"
          @click="choose(membership.tenant.tenantId)"
        >
          <div class="vc-card__header" :style="{ background: membership.tenant.color || '#8864AE' }">
            <span>{{ membership.tenant.visibleName }}</span>
            <span v-if="membership.tenant.teamNumber" class="vc-card__icon">#{{ membership.tenant.teamNumber }}</span>
          </div>
          <div class="vc-card__body">
            <p v-if="membership.tenant.description">{{ membership.tenant.description }}</p>
            <p v-else class="vc-faint">Sem descrição.</p>
            <div class="vc-row">
              <span class="vc-chip vc-chip--purple">{{ membership.roleLabel }}</span>
              <span v-if="membership.tenant.systemTenant" class="vc-chip vc-chip--warning">Administração</span>
              <span class="vc-chip">{{ membership.divisions.length }} divisão(ões)</span>
            </div>
            <p v-if="membership.divisions.length" class="vc-faint" style="margin: 0">
              {{ membership.divisions.map((division) => division.divisionVisibleName).join(' · ') }}
            </p>
          </div>
        </button>
      </div>

      <p class="vc-faint">
        Depois é possível trocar de equipe a qualquer momento pelo seletor no topo da página.
      </p>
    </div>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { authStore } from '@/store/auth.js';

/* Shown right after the login when the user belongs to more than one team. */
const auth = authStore();
const router = useRouter();

function choose(tenantId) {
  auth.setActiveTenant(tenantId);
  router.push({ name: 'home' });
}
</script>

<style scoped>
.tenant-card {
  padding: 0;
  text-align: left;
  font: inherit;
  border: 1px solid var(--vc-border);
  background: var(--vc-surface);
}
</style>
