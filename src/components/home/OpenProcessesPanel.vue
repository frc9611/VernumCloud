<template>
  <section class="vc-stack">
    <SectionTitle lead="Processos" title="Seletivos Abertos">
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'openProcesses' }">Ver todos</router-link>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'myApplications' }">
          Minhas candidaturas
        </router-link>
      </template>
    </SectionTitle>

    <div class="vc-card">
      <div class="vc-card__body">
        <div v-if="processes.length" class="vc-list">
          <div v-for="process in processes.slice(0, LIMIT)" :key="process.publicToken" class="vc-list__item vc-list__item--plain">
            <span class="vc-chip processes__team">
              <span class="vc-dot" :style="{ background: process.tenantColor || 'var(--vc-purple)' }"></span>
              {{ process.tenantName }}
              <template v-if="process.tenantTeamNumber"> #{{ process.tenantTeamNumber }}</template>
            </span>
            <span class="vc-list__text">
              <strong>{{ process.name }}</strong>
              <span v-if="process.endDate">Inscrições até {{ formatDate(process.endDate) }}</span>
              <span v-else>Inscrições abertas</span>
            </span>
            <router-link class="vc-btn vc-btn--small processes__apply" :to="process.publicPath">Candidatar</router-link>
          </div>
        </div>
        <p v-else class="vc-faint" style="margin: 0">Nenhuma equipe está com inscrições abertas agora.</p>
        <p v-if="processes.length > LIMIT" class="vc-faint" style="margin: 0">
          e mais {{ processes.length - LIMIT }} — "Ver todos" lista cada um.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionTitle from '@/components/SectionTitle.vue';

/*
 * The selection processes with open applications, of every team of the platform.
 *
 * A person already in a team had no way to see these from inside the dashboard; this is that way. The
 * "Candidatar" button goes to the public form by its `publicPath`, the same one a visitor uses.
 */
defineProps({
  processes: { type: Array, required: true },
});

const LIMIT = 5;

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}
</script>

<style scoped>
.processes__team {
  flex: none;
}

.processes__apply {
  margin-left: auto;
  flex: none;
}

@media (max-width: 600px) {
  .vc-list__item {
    flex-wrap: wrap;
  }

  .processes__apply {
    margin-left: 0;
  }
}
</style>
