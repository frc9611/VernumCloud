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
      concedem badges à mão. Os marcos — tardes na sala, demandas concluídas, anos na equipe —
      chegam sozinhos.
    </EmptyState>

    <div v-for="group in groups" :key="group.kind" class="vc-stack" style="gap: 8px">
      <strong class="vc-small pbadges__kind">{{ group.label }} <span class="vc-faint">· {{ group.items.length }}</span></strong>

      <!-- ------------------------------------- marcos: the quiet row, never a wall of cards -->
      <template v-if="group.quiet">
        <p class="vc-faint pbadges__note">Conquistados sozinhos, pelo que a pessoa já fez na equipe.</p>
        <div class="pbadges__quiet">
          <article
            v-for="badge in group.items"
            :key="badge.badgeId"
            :class="['pbadges__mini', badge.highlighted ? 'is-highlighted' : '', badge.hidden ? 'is-hidden' : '']"
            :style="{ '--badge-color': colorOf(badge) }"
            :title="badge.description || badge.title"
          >
            <span class="pbadges__mini-icon" aria-hidden="true"><AppIcon :name="iconOf(badge)" :size="15" /></span>
            <span class="pbadges__mini-text">
              <span class="pbadges__mini-title">{{ badge.title }}</span>
              <span v-if="badge.description" class="pbadges__mini-sub">{{ badge.description }}</span>
            </span>
            <button
              v-if="owner"
              :class="['pbadges__mini-action', badge.highlighted ? 'is-on' : '']"
              type="button"
              :title="badge.highlighted ? 'Tirar do destaque' : 'Destacar no topo do perfil'"
              :aria-pressed="badge.highlighted"
              @click="$emit('toggle-highlight', badge)"
            >
              <AppIcon name="star" :size="12" />
            </button>
            <button
              v-if="customizing"
              class="pbadges__mini-action"
              type="button"
              :title="badge.hidden ? 'Mostrar no perfil' : 'Ocultar do perfil'"
              @click="$emit('toggle-hidden', badge)"
            >
              <AppIcon :name="badge.hidden ? 'eye' : 'eyeOff'" :size="12" />
            </button>
          </article>
        </div>
        <p v-if="nextMilestone" class="vc-faint pbadges__next">
          <AppIcon name="target" :size="12" />
          Próximo: <strong>{{ nextMilestone.nextTitle }}</strong> — {{ nextMilestone.value }} de
          {{ nextMilestone.nextThreshold }} {{ nextMilestone.metricLabel }}.
        </p>
      </template>

      <div v-else class="pbadges__grid">
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

    <!-- Sem nenhum marco ainda, a linha do próximo é o único sinal de que eles existem -->
    <p v-if="nextMilestone && !hasMilestones" class="vc-faint pbadges__next">
      <AppIcon name="target" :size="12" />
      Primeiro marco: <strong>{{ nextMilestone.nextTitle }}</strong> — {{ nextMilestone.value }} de
      {{ nextMilestone.nextThreshold }} {{ nextMilestone.metricLabel }}.
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import {
  BADGE_GROUP_LABEL,
  BADGE_KIND_ORDER,
  badgeBackground,
  badgeColor,
  badgeFrameClass,
  badgeIcon,
  isAutomaticBadge,
} from './profileText.js';

/*
 * Every badge of the person, grouped by kind — prizes first, then participations, then the ones
 * granted by hand, and last the marcos. Inside a group, the highlighted ones come first. The owner
 * pins up to three (the server refuses the fourth and the parent shows its message); whoever may
 * remove a hand-granted badge sees the button, generated ones never have it.
 *
 * The marcos are drawn as a quiet row of small flat items instead of the card grid the other kinds
 * get. They are the only badges nobody decided to give: a nightly job counted afternoons in the room
 * and demandas concluded and wrote them. Reading them as loud as the badge a mentor sat down and
 * granted would make the second one worth less, so the screen turns the automatic ones down — same
 * information, a quarter of the ink — and keeps the star and the eye on them all the same.
 *
 * A badge the owner hid is left out unless `customizing` is on, which is also when the eye toggle
 * to hide or show it appears next to the star — a stranger never receives a hidden one at all.
 */
const props = defineProps({
  badges: { type: Array, default: () => [] },
  owner: { type: Boolean, default: false },
  customizing: { type: Boolean, default: false },
  teamColorOf: { type: Function, default: null },
  /** MilestoneService.Progress of the open team, when the reader may see it; [] otherwise. */
  milestones: { type: Array, default: () => [] },
});
defineEmits(['toggle-highlight', 'toggle-hidden', 'remove']);

const visibleBadges = computed(() => (props.customizing ? props.badges : props.badges.filter((badge) => !badge.hidden)));

const groups = computed(() => {
  const byKind = new Map();
  for (const badge of visibleBadges.value) {
    if (!byKind.has(badge.kind)) {
      byKind.set(badge.kind, { kind: badge.kind, label: BADGE_GROUP_LABEL[badge.kind] || badge.kindLabel, items: [] });
    }
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
      quiet: isAutomaticBadge({ kind: group.kind }),
      items: [...group.items].sort((a, b) => Number(b.highlighted) - Number(a.highlighted)),
    }));
});

const hasMilestones = computed(() => groups.value.some((group) => group.quiet));

/*
 * The marco the person is closest to, of the ones still unreached — one line, because a list of
 * everything somebody has not done yet is a list of cobranças with their name on it.
 *
 * Closest by the *fraction* of the ladder walked, never by what is left: "faltam 11 tardes" and
 * "falta 1 ano" are not comparable numbers, and subtracting would pick the year every time.
 * Whoever is at the top of every ladder gets no line at all, which is right for them too.
 */
const nextMilestone = computed(() => {
  const pending = (props.milestones || []).filter((step) => step.nextCode && step.nextThreshold > 0);
  if (!pending.length) return null;
  return [...pending].sort((a, b) => b.value / b.nextThreshold - a.value / a.nextThreshold)[0];
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

/* ---------------------------------------------------------------- marcos: the quiet treatment */

.pbadges__note,
.pbadges__next {
  margin: 0;
  font-size: 0.78rem;
}

.pbadges__next {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.pbadges__quiet {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/*
 * Flat on purpose: no card background, no shadow, no lift on hover. Next to a hand-granted badge
 * this reads as a footnote, which is exactly what it is.
 */
.pbadges__mini {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 4px 10px 4px 5px;
  border: 1px solid var(--vc-border);
  border-radius: 20px;
  background: var(--vc-surface-muted);
}

.pbadges__mini.is-highlighted {
  border-color: color-mix(in srgb, var(--badge-color) 55%, var(--vc-border));
}

.pbadges__mini.is-hidden {
  opacity: 0.55;
}

.pbadges__mini-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--badge-color) 20%, transparent);
  color: var(--badge-color);
}

.pbadges__mini-text {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.pbadges__mini-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vc-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pbadges__mini-sub {
  font-size: 0.74rem;
  color: var(--vc-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pbadges__mini-action {
  appearance: none;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--vc-text-faint);
  cursor: pointer;
}

.pbadges__mini-action:hover {
  color: var(--vc-warning-strong);
}

.pbadges__mini-action.is-on {
  color: var(--vc-warning-strong);
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
