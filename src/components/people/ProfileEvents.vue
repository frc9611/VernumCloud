<template>
  <section class="vc-stack">
    <SectionTitle title="Eventos">
      <template #actions>
        <slot name="actions" />
      </template>
    </SectionTitle>

    <EmptyState v-if="!events.length" title="Nenhum evento registrado">
      Quando a equipe registrar esta pessoa numa competição, oficina ou ação, o evento aparece aqui
      com os prêmios que ela trouxe.
    </EmptyState>

    <div v-else class="vc-grid">
      <article v-for="event in events" :key="event.eventId" class="vc-card pevents__card"
               :style="{ '--team-color': event.color || 'var(--vc-purple)' }">
        <header class="pevents__head">
          <span class="vc-dot" :style="{ background: event.color || 'var(--vc-purple)' }"></span>
          <span class="vc-faint pevents__team">{{ event.tenantName }}</span>
          <span class="vc-spacer"></span>
          <span class="vc-chip">{{ event.kindLabel }}</span>
        </header>
        <div class="vc-card__body">
          <strong class="pevents__name">{{ event.name }}</strong>
          <p class="vc-faint" style="margin: 0">
            <AppIcon name="calendar" :size="13" style="display: inline; vertical-align: -2px" />
            {{ formatEventDates(event.startDate, event.endDate) }}
            <template v-if="event.location"> · {{ event.location }}</template>
          </p>
          <span v-if="event.roleLabel" class="vc-chip vc-chip--purple" style="align-self: flex-start">{{ event.roleLabel }}</span>
          <div v-if="event.awards.length" class="pevents__awards">
            <span
              v-for="award in event.awards"
              :key="award.awardId"
              class="pevents__award"
              :style="{ '--award-color': award.color || event.color || 'var(--vc-purple)' }"
              :title="award.description || ''"
            >
              <AppIcon name="award" :size="14" />
              <span>{{ award.title }}</span>
              <span class="vc-faint">{{ award.scopeLabel }}</span>
            </span>
          </div>
          <p v-else class="vc-faint" style="margin: 0">Participação sem premiação.</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { formatEventDates } from './profileText.js';

/*
 * The events the person went to, with the awards they took home from each one. Same card for a
 * student and a mentor: a team award reaches every participant that was registered, mentor included.
 */
defineProps({
  events: { type: Array, default: () => [] },
});
</script>

<style scoped>
.pevents__card {
  border-top: 3px solid var(--team-color);
}

.pevents__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 0;
}

.pevents__team {
  font-size: 0.82rem;
}

.pevents__name {
  font-size: 1rem;
}

.pevents__awards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pevents__award {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: var(--vc-radius);
  border: 1px solid var(--vc-border);
  border-left: 4px solid var(--award-color);
  background: var(--vc-surface-muted);
  font-size: 0.86rem;
}

.pevents__award .vc-icon {
  color: var(--award-color);
}
</style>
