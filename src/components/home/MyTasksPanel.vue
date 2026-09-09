<template>
  <section class="vc-stack">
    <SectionTitle lead="Suas" title="Demandas">
      <template #actions>
        <span v-if="tasks.length" class="vc-chip">{{ tasks.length }} aberta(s)</span>
        <router-link v-if="canOpenBoard" class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'tasks' }">
          Ver quadro
        </router-link>
      </template>
    </SectionTitle>

    <div class="vc-card">
      <div class="vc-card__body">
        <div v-if="tasks.length" class="vc-list">
          <component
            :is="canOpenBoard ? 'router-link' : 'div'"
            v-for="task in tasks.slice(0, LIMIT)"
            :key="task.taskId"
            :class="['vc-list__item', canOpenBoard ? '' : 'vc-list__item--plain']"
            :to="canOpenBoard ? { name: 'tasks' } : null"
          >
            <span class="vc-dot" :style="{ background: task.overdue ? 'var(--vc-danger-text)' : dotColor(task) }"></span>
            <span class="vc-list__text">
              <strong>{{ task.title }}</strong>
              <span>
                {{ task.statusLabel }} ·
                <span :class="task.overdue ? 'vc-danger-text' : ''">{{ task.dueLabel }}</span>
                <template v-if="task.divisionName"> · {{ task.divisionName }}</template>
              </span>
            </span>
            <span v-if="multiTeam" class="vc-chip tasks__team">
              <span class="vc-dot" :style="{ background: task.tenantColor || 'var(--vc-purple)' }"></span>
              {{ task.tenantName }}
            </span>
          </component>
        </div>
        <p v-else class="vc-faint" style="margin: 0">Nenhuma demanda aberta vinculada a você.</p>
        <p v-if="tasks.length > LIMIT" class="vc-faint" style="margin: 0">
          e mais {{ tasks.length - LIMIT }}<template v-if="canOpenBoard"> — abra o quadro para ver todas</template>.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionTitle from '@/components/SectionTitle.vue';

/*
 * The open demandas assigned to whoever is reading, across every team they are in.
 *
 * The rows come from GET /tasks/mine already filtered by the parent; this panel only says which team
 * each one belongs to when that matters (more than one team) and where the deadline stands. The rows
 * open the board of the team that is open, which has the "Todas as equipes" switch for the rest.
 */
defineProps({
  tasks: { type: Array, required: true },
  multiTeam: { type: Boolean, default: false },
  /** Whether the tasks route opens in the team that is open; otherwise the rows are plain. */
  canOpenBoard: { type: Boolean, default: false },
});

const LIMIT = 8;

/* The priority colours the kanban uses on its left border, so the dot reads the same way. */
function dotColor(task) {
  if (task.priority === 'HIGH') return 'var(--vc-warning-strong)';
  if (task.priority === 'LOW') return 'var(--vc-success-text)';
  return 'var(--vc-text-faint)';
}
</script>

<style scoped>
.tasks__team {
  margin-left: auto;
}
</style>
