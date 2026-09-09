<template>
  <section class="vc-stack">
    <SectionTitle title="História">
      <template #actions>
        <slot name="actions" />
      </template>
    </SectionTitle>

    <EmptyState v-if="!items.length" title="Nenhuma história registrada">
      Afiliações passadas e eventos aparecem aqui, mesmo depois que a pessoa sai de uma equipe.
    </EmptyState>

    <ol v-else class="timeline">
      <li v-for="item in items" :key="item.key" class="timeline__item" :style="{ '--dot': item.color }">
        <div class="timeline__head">
          <AppIcon :name="item.icon" :size="14" class="timeline__icon" />
          <strong class="timeline__title">{{ item.title }}</strong>
          <span v-if="item.kindLabel" class="vc-chip">{{ item.kindLabel }}</span>
          <span class="vc-spacer"></span>
          <span class="vc-faint timeline__when">{{ item.when }}</span>
        </div>
        <p class="timeline__sub">
          {{ item.subtitle }}
          <template v-if="item.source"> · <span class="vc-faint">{{ item.source }}</span></template>
        </p>
        <p v-if="item.note" class="timeline__note">{{ item.note }}</p>
        <div v-if="item.awards && item.awards.length" class="vc-row" style="flex-wrap: wrap">
          <span
            v-for="award in item.awards"
            :key="award.awardId"
            class="vc-chip"
            :style="{ borderColor: award.color || item.color, color: award.color || 'inherit' }"
          >
            <AppIcon name="award" :size="12" />
            {{ award.title }} · {{ award.scopeLabel }}
          </span>
        </div>
        <div v-if="item.affiliation && item.affiliation.canEdit" class="vc-row timeline__tools">
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('edit-affiliation', item.affiliation)">
            <AppIcon name="edit" :size="13" />
            Editar
          </button>
          <button
            v-if="item.affiliation.source === 'MANUAL'"
            class="vc-btn vc-btn--danger vc-btn--small"
            type="button"
            @click="$emit('remove-affiliation', item.affiliation)"
          >
            Remover
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { formatEventDates, formatRange, teamLabel } from './profileText.js';

/*
 * One timeline for two kinds of fact: the teams the person was in (past affiliations, written
 * automatically when they leave or by an administrator) and the events they went to. Most recent
 * first. Each affiliation keeps the label of the cargo it was lived with, so a mentor who left
 * stays in the story as a mentor.
 */
const props = defineProps({
  affiliations: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
});
defineEmits(['edit-affiliation', 'remove-affiliation']);

function sortKey(...dates) {
  for (const date of dates) {
    if (date) return String(date).slice(0, 10);
  }
  return '';
}

const items = computed(() => {
  const affiliations = props.affiliations.map((affiliation) => ({
    key: 'a' + affiliation.affiliationId,
    sort: sortKey(affiliation.endDate, affiliation.startDate, affiliation.createdAt),
    color: affiliation.color || 'var(--vc-text-faint)',
    icon: 'history',
    title: teamLabel(affiliation.teamName, affiliation.teamNumber),
    kindLabel: affiliation.roleLabel || '',
    when: formatRange(affiliation.startDate, affiliation.endDate),
    subtitle: affiliation.tenantId ? 'Equipe da plataforma' : 'Equipe de fora da plataforma',
    source: affiliation.sourceLabel,
    note: affiliation.note,
    affiliation,
  }));
  const events = props.events.map((event) => ({
    key: 'e' + event.eventId,
    sort: sortKey(event.endDate, event.startDate),
    color: event.color || 'var(--vc-purple)',
    icon: 'calendar',
    title: event.name,
    kindLabel: event.kindLabel,
    when: formatEventDates(event.startDate, event.endDate),
    subtitle: [event.tenantName, event.location, event.roleLabel].filter(Boolean).join(' · '),
    source: '',
    note: '',
    awards: event.awards,
  }));
  return [...affiliations, ...events].sort((a, b) => (a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : 0));
});
</script>

<style scoped>
.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 22px;
  border-left: 2px solid var(--vc-border);
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline__item {
  position: relative;
  padding: 10px 14px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline__item::before {
  content: '';
  position: absolute;
  left: -29px;
  top: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dot);
  border: 2px solid var(--vc-bg);
}

.timeline__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline__icon {
  color: var(--dot);
}

.timeline__title {
  font-size: 0.95rem;
}

.timeline__when {
  font-size: 0.82rem;
  white-space: nowrap;
}

.timeline__sub {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vc-text-muted);
}

.timeline__note {
  margin: 0;
  font-size: 0.88rem;
  white-space: pre-line;
}

.timeline__tools {
  padding-top: 4px;
}
</style>
