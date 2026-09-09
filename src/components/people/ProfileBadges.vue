<template>
  <section class="vc-stack">
    <SectionTitle title="Badges">
      <template #actions>
        <span v-if="owner && badges.length" class="vc-faint">Destaque até 3 no topo do perfil.</span>
        <slot name="actions" />
      </template>
    </SectionTitle>

    <EmptyState v-if="!badges.length" title="Nenhum badge ainda">
      Participar de um evento ou ganhar um prêmio gera um badge; a equipe e a plataforma também
      concedem badges à mão.
    </EmptyState>

    <div v-for="group in groups" :key="group.kind" class="vc-stack" style="gap: 8px">
      <strong class="vc-small pbadges__kind">{{ group.label }} <span class="vc-faint">· {{ group.items.length }}</span></strong>
      <div class="pbadges__grid">
        <article
          v-for="badge in group.items"
          :key="badge.badgeId"
          :class="['pbadges__card', badge.highlighted ? 'is-highlighted' : '']"
          :style="{ '--badge-color': colorOf(badge) }"
        >
          <div class="pbadges__row">
            <span class="pbadges__icon" aria-hidden="true"><AppIcon :name="iconOf(badge)" :size="18" /></span>
            <div class="pbadges__text">
              <strong>{{ badge.title }}</strong>
              <span class="vc-faint">
                {{ badge.issuerName || 'plataforma' }} · {{ formatDate(badge.grantedAt) }}
                <template v-if="badge.grantedBy"> · por {{ badge.grantedBy.name }}</template>
              </span>
            </div>
            <button
              v-if="owner"
              :class="['pbadges__star', badge.highlighted ? 'is-on' : '']"
              type="button"
              :title="badge.highlighted ? 'Tirar do destaque' : 'Destacar no topo do perfil'"
              :aria-pressed="badge.highlighted"
              @click="$emit('toggle-highlight', badge)"
            >
              <AppIcon name="star" :size="16" />
              {{ badge.highlighted ? 'destacado' : 'destacar' }}
            </button>
          </div>
          <p v-if="badge.description" class="pbadges__description">{{ badge.description }}</p>
          <div v-if="badge.canRemove" class="vc-row" style="justify-content: flex-end">
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('remove', badge)">
              <AppIcon name="trash" :size="13" />
              remover
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { BADGE_KIND_ORDER, badgeColor, badgeIcon, formatDate } from './profileText.js';

/*
 * Every badge of the person, grouped by kind — prizes first, then participations, then the ones
 * granted by hand. Inside a group, the highlighted ones come first. The owner pins up to three
 * (the server refuses the fourth and the parent shows its message); whoever may remove a
 * hand-granted badge sees the button, generated ones never have it.
 */
const props = defineProps({
  badges: { type: Array, default: () => [] },
  owner: { type: Boolean, default: false },
  teamColorOf: { type: Function, default: null },
});
defineEmits(['toggle-highlight', 'remove']);

const groups = computed(() => {
  const byKind = new Map();
  for (const badge of props.badges) {
    if (!byKind.has(badge.kind)) byKind.set(badge.kind, { kind: badge.kind, label: badge.kindLabel, items: [] });
    byKind.get(badge.kind).items.push(badge);
  }
  const order = (kind) => {
    const index = BADGE_KIND_ORDER.indexOf(kind);
    return index === -1 ? BADGE_KIND_ORDER.length : index;
  };
  return [...byKind.values()]
    .sort((a, b) => order(a.kind) - order(b.kind))
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => Number(b.highlighted) - Number(a.highlighted)),
    }));
});

function colorOf(badge) {
  return badgeColor(badge, props.teamColorOf);
}

function iconOf(badge) {
  return badgeIcon(badge);
}
</script>

<style scoped>
.pbadges__kind {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-text-muted);
}

.pbadges__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.pbadges__card {
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-left: 4px solid var(--badge-color);
  border-radius: var(--vc-radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pbadges__card.is-highlighted {
  box-shadow: 0 0 0 1px var(--vc-purple-border);
}

.pbadges__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.pbadges__icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--badge-color);
  color: var(--vc-on-accent);
}

.pbadges__text {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
  font-size: 0.9rem;
}

.pbadges__text .vc-faint {
  font-size: 0.78rem;
}

.pbadges__star {
  appearance: none;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--vc-border-strong);
  background: var(--vc-surface);
  color: var(--vc-text-muted);
  border-radius: 20px;
  padding: 2px 9px;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}

.pbadges__star:hover {
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

.pbadges__star.is-on {
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

.pbadges__description {
  margin: 0;
  font-size: 0.86rem;
  color: var(--vc-text-muted);
}
</style>
