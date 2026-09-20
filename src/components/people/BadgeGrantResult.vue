<template>
  <div class="vc-stack">
    <AlertBanner :variant="result.granted ? 'success' : 'warning'" :title="headline" :aside="result.campaign?.title">
      {{ line }}
    </AlertBanner>

    <div v-if="groups.length" class="vc-stack bgr__skipped">
      <strong class="vc-small">Quem ficou de fora</strong>
      <div v-for="group in groups" :key="group.reason" class="bgr__group">
        <span class="vc-chip vc-chip--warning">{{ group.reason }}</span>
        <span class="vc-faint">{{ group.count }} {{ group.count === 1 ? 'pessoa' : 'pessoas' }}</span>
        <span v-if="group.people.length" class="bgr__names">
          <PersonLink v-for="person in group.people" :key="person.userId"
                      :user-id="person.userId" :name="person.name" muted />
        </span>
      </div>
      <span v-if="result.skippedCount > (result.skipped?.length || 0)" class="vc-faint">
        e mais {{ result.skippedCount - result.skipped.length }}: a lista de motivos para na quinquagésima.
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AlertBanner from '@/components/AlertBanner.vue';
import PersonLink from '@/components/PersonLink.vue';

/*
 * What a mass grant did, as the person who pressed the button reads it.
 *
 * The reasons are grouped instead of listed one by one, and that is the whole point of the
 * component: "conceder aos que faltam" reports everybody who already holds the badge as skipped, so
 * a plain list turns a run where nothing went wrong into two hundred lines that look like errors.
 * Grouped, the same answer reads as one line — "Já tinha este badge · 200 pessoas" — and a real
 * problem ("Associação suspensa", "Falhou ao gravar") stands alone next to it where it can be seen.
 *
 * The server names only the people it skipped for a reason worth naming; the ones it leaves unnamed
 * are counted and not invented.
 */
const props = defineProps({
  /** A BadgeGrantResultDto, from the grant or from the rerun. */
  result: { type: Object, required: true },
});

const headline = computed(() => (props.result.granted ? 'Badge concedido!' : 'Ninguém novo recebeu.'));

const line = computed(() => {
  const granted = props.result.granted || 0;
  const reached = props.result.reached || 0;
  const head = granted === 1 ? '1 pessoa recebeu' : `${granted} pessoas receberam`;
  const skipped = props.result.skippedCount || 0;
  return `${head} de ${reached} ${reached === 1 ? 'alcançada' : 'alcançadas'}` +
    (skipped ? ` · ${skipped} de fora, pelos motivos abaixo.` : '.');
});

/** The skipped people gathered by reason, each group keeping the names the server did send. */
const groups = computed(() => {
  const byReason = new Map();
  for (const person of props.result.skipped || []) {
    const reason = person.reason || 'Sem motivo informado';
    if (!byReason.has(reason)) byReason.set(reason, { reason, count: 0, people: [] });
    const group = byReason.get(reason);
    group.count += 1;
    if (person.name) group.people.push(person);
  }
  return [...byReason.values()];
});
</script>

<style scoped>
.bgr__skipped {
  gap: 6px;
}

.bgr__group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 5px 0;
  border-bottom: 1px solid var(--vc-border);
}

.bgr__group:last-of-type {
  border-bottom: 0;
}

.bgr__names {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 10px;
  font-size: 0.82rem;
}
</style>
