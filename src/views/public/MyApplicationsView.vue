<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Minhas candidaturas</h1>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <EmptyState v-else-if="!entries.length" title="Você não tem candidaturas">
        Só aparecem aqui as candidaturas enviadas enquanto você estava logado.
        <template #actions>
          <router-link class="vc-btn" :to="{ name: 'openProcesses' }">Ver processos abertos</router-link>
        </template>
      </EmptyState>

      <div v-else class="vc-stack">
        <article v-for="entry in entries" :key="entry.recruitmentEntryId" class="vc-card">
          <header class="vc-card__header">
            <span>{{ entry.processName }}</span>
            <span class="vc-card__icon">{{ entry.statusLabel }}</span>
          </header>
          <div class="vc-card__body">
            <div class="vc-row">
              <span class="vc-badge" :class="badgeClass(entry.status)">{{ entry.statusLabel }}</span>
              <span v-if="entry.currentStageName" class="vc-chip vc-chip--purple">
                Etapa: {{ entry.currentStageName }}
              </span>
              <span class="vc-chip">Inscrito em {{ formatWhen(entry.submittedAt) }}</span>
            </div>

            <p v-if="entry.divisions.length" class="vc-small vc-muted" style="margin: 0">
              Divisões: {{ entry.divisions.map((division) => division.visibleName).join(', ') }}
            </p>

            <template v-if="entry.notes && entry.notes.length">
              <hr class="vc-divider" />
              <strong class="vc-small">Retorno da equipe</strong>
              <article v-for="note in entry.notes" :key="note.recruitmentNoteId" class="apply__note">
                <div class="vc-row vc-row--between">
                  <span class="vc-chip">{{ note.decisionLabel }}</span>
                  <span class="vc-faint">{{ formatWhen(note.createdAt) }}</span>
                </div>
                <p style="margin: 6px 0 0">{{ note.content }}</p>
              </article>
            </template>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import { recruitment } from '@/services/api.js';

/*
 * What a candidate sees about their own applications. Only the anotações the team marked as
 * visible to the candidate come back from the server.
 */
const entries = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await recruitment.myEntries();
    entries.value = data;
  } catch (error) {
    entries.value = [];
  } finally {
    loading.value = false;
  }
});

function badgeClass(status) {
  if (status === 'APPROVED') return 'vc-badge--on';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'vc-badge--off';
  if (status === 'IN_REVIEW') return 'vc-badge--purple';
  return 'vc-badge--neutral';
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
</script>

<style scoped>
.apply__note {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  padding: 10px 12px;
  background: var(--vc-surface-muted);
}
</style>
