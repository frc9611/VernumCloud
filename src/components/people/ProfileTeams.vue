<template>
  <section class="vc-stack pteams">
    <SectionTitle title="Equipes">
      <template #actions>
        <span class="vc-faint">{{ memberships.length }} {{ memberships.length === 1 ? 'equipe' : 'equipes' }}</span>
      </template>
    </SectionTitle>

    <EmptyState v-if="!memberships.length" title="Sem equipe no momento">
      <template v-if="hasHistory">A história desta pessoa está logo abaixo.</template>
      <template v-else>Quando entrar numa equipe, ela aparece aqui.</template>
    </EmptyState>

    <div v-else class="vc-grid">
      <article v-for="membership in memberships" :key="membership.tenantId" class="vc-card pteams__card">
        <header class="pteams__head" :style="{ '--team-color': membership.color || 'var(--vc-purple)' }">
          <span class="pteams__dot" aria-hidden="true"></span>
          <strong class="pteams__team">{{ membership.tenantName }}</strong>
          <span v-if="membership.teamNumber" class="vc-faint">#{{ membership.teamNumber }}</span>
          <span class="vc-spacer"></span>
          <span class="vc-badge vc-badge--purple">{{ membership.roleLabel }}</span>
        </header>

        <div class="vc-card__body">
          <div class="vc-row" style="flex-wrap: wrap">
            <span v-if="membership.staff" class="vc-chip">conduz a equipe</span>
            <span
              v-for="division in membership.divisions"
              :key="division.divisionMembershipId"
              class="vc-chip vc-chip--purple"
              :title="division.leader ? 'Lidera a divisão' : ''"
            >
              {{ division.divisionVisibleName }}
              <template v-if="division.position"> · {{ division.position }}</template>
              <AppIcon v-if="division.leader" name="shield" :size="12" />
            </span>
            <span v-if="!membership.divisions.length && !membership.staff" class="vc-faint">Sem divisão.</span>
          </div>
          <p class="vc-faint" style="margin: 0">Desde {{ formatDate(membership.joinedAt) }}</p>
        </div>

        <footer v-if="auth.membershipOn(membership.tenantId)" class="vc-card__footer">
          <span v-if="membership.tenantId === auth.activeTenantId" class="vc-faint">Equipe aberta agora.</span>
          <button v-else class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openTeam(membership.tenantId)">
            Abrir esta equipe
          </button>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { formatDate } from './profileText.js';

/*
 * The teams the person is in today, one card each: cargo, divisions, since when. When whoever is
 * reading is also in that team, the card offers to open it — the profile is the one page that
 * spans every team, so it is a natural place to jump from.
 */
defineProps({
  memberships: { type: Array, default: () => [] },
  hasHistory: { type: Boolean, default: false },
});

const auth = authStore();
const router = useRouter();

function openTeam(tenantId) {
  auth.setActiveTenant(tenantId);
  router.push({ name: 'home' });
}
</script>

<style scoped>
.pteams__card {
  display: flex;
  flex-direction: column;
}

.pteams__card > .vc-card__body {
  flex-grow: 1;
}

.pteams__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vc-border);
  border-top: 3px solid var(--team-color);
  background: var(--vc-surface-muted);
}

.pteams__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--team-color);
  flex: none;
}

.pteams__team {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
