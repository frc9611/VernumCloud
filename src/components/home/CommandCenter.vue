<template>
  <div class="vc-stack">
    <SectionTitle lead="Central de" title="Comando">
      <template #actions>
        <span v-if="dashboard && dashboard.competitionCategory !== 'NONE'" class="vc-chip vc-chip--purple">
          {{ dashboard.competitionCategoryLabel }}
        </span>
        <router-link v-if="auth.can('PERFORMANCE_VIEW') && auth.featureOn('PERFORMANCE')"
                     class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'performance' }">
          Performance
        </router-link>
        <button v-if="auth.can('TENANT_MANAGE')" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                :disabled="exporting" @click="backup">
          <AppIcon name="download" :size="15" />
          {{ exporting ? 'Gerando...' : 'Backup em JSON' }}
        </button>
      </template>
    </SectionTitle>

    <!-- The tools of whoever conducts the team, in one row. -->
    <div v-if="tools.length" class="vc-row">
      <router-link v-for="tool in tools" :key="tool.key" class="vc-chip vc-chip--button center__tool" :to="tool.to">
        <AppIcon :name="tool.icon" :size="14" />
        {{ tool.label }}
      </router-link>
    </div>

    <template v-if="dashboard">
      <div class="vc-metrics">
        <div v-if="dashboard.readiness" class="vc-metric">
          <div class="vc-metric__head"><span>Prontidão da equipe</span><AppIcon name="gauge" :size="16" /></div>
          <div class="vc-metric__value">{{ dashboard.readiness.readinessScore ?? '—' }}</div>
          <div class="vc-metric__foot">{{ dashboard.readiness.nextMilestone || 'próximo marco a definir' }}</div>
        </div>
        <router-link v-if="auth.featureOn('TASKS') && auth.can('TASK_VIEW')" class="vc-metric" :to="{ name: 'tasks' }">
          <div class="vc-metric__head"><span>Demandas abertas</span><AppIcon name="kanban" :size="16" /></div>
          <div :class="['vc-metric__value', dashboard.metrics.blockedTasks ? 'vc-metric__value--danger' : '']">
            {{ dashboard.metrics.openTasks }}
          </div>
          <div class="vc-metric__foot">
            {{ dashboard.metrics.blockedTasks }} bloqueada(s) · {{ dashboard.metrics.overdueTasks }} atrasada(s)
          </div>
        </router-link>
        <router-link v-if="auth.featureOn('RISKS') && auth.can('RISK_VIEW')" class="vc-metric" :to="{ name: 'risks' }">
          <div class="vc-metric__head"><span>Riscos críticos</span><AppIcon name="alert" :size="16" /></div>
          <div :class="['vc-metric__value', dashboard.metrics.criticalRisks ? 'vc-metric__value--danger' : '']">
            {{ dashboard.metrics.criticalRisks }}
          </div>
          <div class="vc-metric__foot">{{ dashboard.metrics.openRisks }} risco(s) em aberto</div>
        </router-link>
        <router-link v-if="dashboard.metrics.frequencyAlerts !== null" class="vc-metric" :to="{ name: 'development' }">
          <div class="vc-metric__head"><span>Frequência em atenção</span><AppIcon name="users" :size="16" /></div>
          <div :class="['vc-metric__value', dashboard.metrics.frequencyAlerts ? 'vc-metric__value--warning' : '']">
            {{ dashboard.metrics.frequencyAlerts }}
          </div>
          <div class="vc-metric__foot">
            abaixo de {{ dashboard.metrics.attendanceThreshold }}% · {{ dashboard.metrics.frequencyUnknown }} a validar
          </div>
        </router-link>
        <div v-if="dashboard.metrics.reliability !== null" class="vc-metric">
          <div class="vc-metric__head"><span>Confiabilidade</span><AppIcon name="target" :size="16" /></div>
          <div class="vc-metric__value">{{ dashboard.metrics.reliability }}%</div>
          <div class="vc-metric__foot">{{ dashboard.metrics.runCount }} registro(s) medido(s)</div>
        </div>
      </div>

      <div class="vc-split">
        <PanelCard title="Atenção necessária" icon="alert" muted>
          <div v-if="dashboard.attention.length" class="vc-list">
            <router-link v-for="(item, index) in dashboard.attention" :key="index" class="vc-list__item" :to="item.link">
              <span class="vc-dot" :style="{ background: item.severity === 'DANGER'
                ? 'var(--vc-danger-text)' : 'var(--vc-warning-strong)' }"></span>
              <span class="vc-list__text">
                <strong>{{ item.title }}</strong>
                <span>{{ item.detail }}</span>
              </span>
              <span class="vc-list__aside">abrir ›</span>
            </router-link>
          </div>
          <p v-else class="vc-faint" style="margin: 0">Nada pedindo decisão agora.</p>
        </PanelCard>

        <PanelCard title="Vencendo agora" icon="clock" muted>
          <p class="vc-faint" style="margin-top: 0">
            Em até {{ dashboard.metrics.reminderDays }} dia(s), mais as atrasadas. O lembrete diário alcança
            quem está vinculado.
          </p>
          <div v-if="dashboard.reminders.length" class="vc-list">
            <router-link v-for="task in dashboard.reminders.slice(0, 6)" :key="task.taskId"
                         class="vc-list__item" :to="{ name: 'tasks' }">
              <span class="vc-dot" :style="{ background: task.overdue
                ? 'var(--vc-danger-text)' : 'var(--vc-warning-strong)' }"></span>
              <span class="vc-list__text">
                <strong>{{ task.title }}</strong>
                <span>{{ task.ownerLabel || 'sem responsável' }} · {{ task.dueLabel }}</span>
              </span>
            </router-link>
          </div>
          <p v-else class="vc-faint" style="margin: 0">Nenhuma demanda vencendo.</p>
        </PanelCard>
      </div>
    </template>

    <EmptyState v-else title="Sem números por enquanto">
      O painel da equipe não respondeu. Recarregue a página ou tente de novo daqui a pouco.
    </EmptyState>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { teamDashboard } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

/*
 * The tab of whoever conducts the team: the few numbers that decide what somebody does next, the
 * items asking for a decision, the deadlines of the week, and one row with every mentor tool.
 *
 * `dashboard` is GET /tenants/{id}/dashboard, already cut by the server to what the reader may see; null
 * means the call failed, and the tab says so instead of showing zeros that would read as good news.
 */
defineProps({
  dashboard: { type: Object, default: null },
});

const auth = authStore();
const toast = useToast();
const exporting = ref(false);

/* Each tool only when its feature is on and the route would let the person in. */
const tools = computed(() => {
  const items = [];
  if (auth.featureOn('TASKS') && auth.can('TASK_VIEW')) {
    items.push({ key: 'tasks', label: 'Demandas', icon: 'kanban', to: { name: 'tasks' } });
  }
  if (auth.featureOn('RISKS') && auth.can('RISK_VIEW')) {
    items.push({ key: 'risks', label: 'Riscos', icon: 'alert', to: { name: 'risks' } });
  }
  if (auth.featureOn('MEMBER_DEVELOPMENT')) {
    items.push({ key: 'development', label: 'Desenvolvimento', icon: 'seedling', to: { name: 'development' } });
  }
  if (auth.featureOn('EVALUATIONS')) {
    items.push({ key: 'evaluations', label: 'Avaliações', icon: 'star', to: { name: 'evaluations' } });
  }
  if (auth.featureOn('JOURNAL') && auth.can('JOURNAL_VIEW')) {
    items.push({ key: 'journal', label: 'Caderno', icon: 'notebook', to: { name: 'journal' } });
  }
  if (auth.featureOn('PERFORMANCE') && auth.can('PERFORMANCE_VIEW')) {
    items.push({ key: 'performance', label: 'Performance', icon: 'target', to: { name: 'performance' } });
  }
  if (auth.can('TENANT_MANAGE')) {
    items.push({ key: 'features', label: 'Recursos da equipe', icon: 'sliders', to: { name: 'adminFeatures' } });
  }
  return items;
});

/** Downloads the JSON backup of the team as a file, named after the team and the day. */
async function backup() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const { data } = await teamDashboard.export(auth.activeTenantId);
    const slug = auth.activeTenant?.slug || 'equipe';
    const day = toDateInputValue(new Date()); //The day here, not the UTC one: at ten at night they differ
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vernum-${slug}-${day}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Backup gerado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível gerar o backup.'));
  } finally {
    exporting.value = false;
  }
}
</script>

<style scoped>
.center__tool {
  text-decoration: none;
  padding: 5px 12px;
}
</style>
