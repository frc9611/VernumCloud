<template>
  <section class="vc-stack">
    <SectionTitle title="Badges">
      <template #actions>
        <span v-if="owner && visibleBadges.length" class="vc-faint">Destaque até 3 no topo do perfil.</span>
        <slot name="actions" />
      </template>
    </SectionTitle>

    <p v-if="customizing" class="vc-faint" style="margin: 0">
      O olho decide se um badge aparece no seu perfil público — destacar um badge oculto mostra ele de novo.
    </p>

    <EmptyState v-if="!visibleBadges.length" title="Nenhum badge ainda">
      Participar de um evento ou ganhar um prêmio gera um badge; a equipe e a plataforma também
      concedem badges à mão.
    </EmptyState>

    <div v-for="group in groups" :key="group.kind" class="vc-stack" style="gap: 8px">
      <strong class="vc-small pbadges__kind">{{ group.label }} <span class="vc-faint">· {{ group.items.length }}</span></strong>
      <div class="pbadges__grid">
        <article
          v-for="badge in group.items"
          :key="badge.badgeId"
          :class="['pbadges__card', badge.highlighted ? 'is-highlighted' : '', badge.hidden ? 'is-hidden' : '']"
          :style="{ '--badge-color': colorOf(badge), '--badge-bg': backgroundOf(badge) }"
        >
          <button
            v-if="owner"
            :class="['pbadges__star', badge.highlighted ? 'is-on' : '']"
            type="button"
            :title="badge.highlighted ? 'Tirar do destaque' : 'Destacar no topo do perfil'"
            :aria-pressed="badge.highlighted"
            @click="$emit('toggle-highlight', badge)"
          >
            <AppIcon name="star" :size="14" />
          </button>
          <span :class="['pbadges__icon', frameOf(badge)]" aria-hidden="true"><AppIcon :name="iconOf(badge)" :size="28" /></span>
          <strong class="pbadges__title" :style="{ color: badge.textColor || 'inherit' }">{{ badge.title }}</strong>
          <p v-if="badge.description" class="pbadges__description">{{ badge.description }}</p>
          <div v-if="badge.hidden" class="pbadges__meta">
            <span class="vc-chip">oculto</span>
          </div>
          <div v-if="customizing || badge.canRemove" class="vc-row pbadges__actions">
            <button
              v-if="customizing"
              class="vc-btn vc-btn--ghost vc-btn--small"
              type="button"
              @click="$emit('toggle-hidden', badge)"
            >
              <AppIcon :name="badge.hidden ? 'eye' : 'eyeOff'" :size="13" />
              {{ badge.hidden ? 'mostrar' : 'ocultar' }}
            </button>
            <button v-if="badge.canRemove" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('remove', badge)">
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
import { BADGE_KIND_ORDER, badgeBackground, badgeColor, badgeFrameClass, badgeIcon } from './profileText.js';

/*
 * Every badge of the person, grouped by kind — prizes first, then participations, then the ones
 * granted by hand. Inside a group, the highlighted ones come first. The owner pins up to three
 * (the server refuses the fourth and the parent shows its message); whoever may remove a
 * hand-granted badge sees the button, generated ones never have it.
 *
 * A badge the owner hid is left out unless `customizing` is on, which is also when the eye toggle
 * to hide or show it appears next to the star — a stranger never receives a hidden one at all.
 */
const props = defineProps({
  badges: { type: Array, default: () => [] },
  owner: { type: Boolean, default: false },
  customizing: { type: Boolean, default: false },
  teamColorOf: { type: Function, default: null },
});
defineEmits(['toggle-highlight', 'toggle-hidden', 'remove']);

const visibleBadges = computed(() => (props.customizing ? props.badges : props.badges.filter((badge) => !badge.hidden)));

const groups = computed(() => {
  const byKind = new Map();
  for (const badge of visibleBadges.value) {
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

function backgroundOf(badge) {
  return badgeBackground(badge, colorOf(badge));
}

function iconOf(badge) {
  return badgeIcon(badge);
}

function frameOf(badge) {
  return badgeFrameClass(badge);
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
  position: relative;
  background: var(--badge-bg);
  border: 1px solid color-mix(in srgb, var(--badge-color) 35%, var(--vc-border));
  border-radius: var(--vc-radius-lg);
  padding: 18px 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.pbadges__card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -12px color-mix(in srgb, var(--badge-color) 60%, transparent);
}

.pbadges__card.is-highlighted {
  box-shadow: 0 0 0 2px var(--badge-color);
}

.pbadges__card.is-hidden {
  opacity: 0.55;
}

.pbadges__icon {
  position: relative;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--badge-color);
  color: var(--vc-on-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--badge-color) 22%, transparent);
  margin-bottom: 4px;
}

.pbadges__title {
  font-size: 0.94rem;
  line-height: 1.25;
}

.pbadges__description {
  margin: 0;
  font-size: 0.82rem;
  color: var(--vc-text-muted);
}

.pbadges__meta {
  display: flex;
  justify-content: center;
}

.pbadges__star {
  position: absolute;
  top: 8px;
  right: 8px;
  appearance: none;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--vc-border-strong);
  background: var(--vc-surface);
  color: var(--vc-text-muted);
  border-radius: 50%;
  cursor: pointer;
}

.pbadges__star:hover {
  border-color: var(--vc-warning-strong);
  color: var(--vc-warning-strong);
}

.pbadges__star.is-on {
  background: var(--vc-warning-strong);
  border-color: var(--vc-warning-strong);
  color: var(--vc-on-accent);
}

.pbadges__actions {
  justify-content: center;
  margin-top: 2px;
}
</style>
