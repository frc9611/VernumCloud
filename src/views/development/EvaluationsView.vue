<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Avaliações</h1>
        <router-link v-if="scope?.canEvaluate" class="vc-btn" :to="{ name: 'development' }">
          Avaliar alguém
        </router-link>
      </div>

      <AlertBanner variant="info" :title="'Você está vendo ' + (scope?.reachLabel || '...') + '.'"
                   :aside="evaluations.length + ' registro(s)'">
        Uma avaliação é um diagnóstico que aponta a próxima oportunidade de desenvolvimento, não uma
        nota. A pessoa lê as que foram compartilhadas com ela; ler as da equipe inteira pede permissão.
      </AlertBanner>

      <PanelCard v-if="showTrend" title="Evolução" icon="chart" muted>
        <TrendChart :series="trend?.series || []" :title="trendTitle" />
        <p class="vc-faint" style="font-size: 0.76rem; margin: 10px 0 0">
          Um ponto por dia em que alguém foi avaliado, com a média das avaliações daquele dia que você
          alcança — a mesma régua da lista abaixo, nunca uma a mais.
        </p>
      </PanelCard>

      <div class="vc-row" style="flex-wrap: wrap">
        <select v-if="scope?.reach !== 'SELF'" class="vc-select" style="max-width: 260px"
                v-model="filterUser" @change="load">
          <option value="">Todas as pessoas</option>
          <option v-for="person in people" :key="person.userId" :value="person.userId">
            {{ person.name }}
          </option>
        </select>
        <span class="vc-spacer"></span>
      </div>

      <div class="vc-grid">
        <PanelCard v-for="evaluation in evaluations" :key="evaluation.evaluationId"
                   :title="evaluation.subject.name" muted>
          <template #header-actions>
            <span v-if="!evaluation.sharedWithMember" class="vc-badge vc-badge--neutral"
                  style="margin-left: auto" title="A pessoa avaliada não lê esta anotação">
              interna
            </span>
          </template>
          <p class="vc-faint" style="margin-top: 0">
            {{ formatDate(evaluation.evaluationDate) }}
            <template v-if="evaluation.author"> · por <PersonLink :user-id="evaluation.author.userId" :name="evaluation.author.name" muted /></template>
          </p>
          <div class="vc-row" style="flex-wrap: wrap">
            <span v-if="evaluation.autonomy" class="vc-chip">autonomia {{ evaluation.autonomy }}/4</span>
            <span v-if="evaluation.skillFocus" class="vc-chip vc-chip--purple">
              próxima: {{ evaluation.skillFocus }}
            </span>
          </div>
          <p v-if="evaluation.notes">{{ evaluation.notes }}</p>
          <p v-else class="vc-faint">Sem observações.</p>
          <template v-if="scope?.canEvaluate" #footer>
            <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(evaluation)">
              Excluir
            </button>
          </template>
        </PanelCard>
      </div>

      <EmptyState v-if="!evaluations.length" title="Nenhuma avaliação">
        {{ scope?.canEvaluate
          ? 'Abra o mapa de pessoas para registrar o primeiro ciclo.'
          : 'Quando alguém registrar uma avaliação sua, ela aparece aqui.' }}
      </EmptyState>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import PersonLink from '@/components/PersonLink.vue';
import PanelCard from '@/components/PanelCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import TrendChart from '@/components/TrendChart.vue';
import { authStore } from '@/store/auth.js';
import { development } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

/*
 * The history of the evaluation cycles the reader may see, and the curve of the same thing.
 *
 * The people in the filter come from the evaluations that came back, not from the members of the
 * team: this screen asks for no permission on purpose, and somebody with none still opens it to read
 * their own. They are keyed by userId — the chart asks the server for one person, and two people
 * called "João Silva" would otherwise share a line.
 */
const auth = authStore();
const toast = useToast();

/* A year, not the 180 days the route defaults to: a cycle happens a few times a season, and half a
 * season can easily hold a single point — which is not a curve and the chart would say so. */
const TREND_DAYS = 365;

const evaluations = ref([]);
const scope = ref(null);
const filterUser = ref('');
const trend = ref(null);
/* Starts hidden and stays hidden when the call fails, so the card never flashes "sem registros
 * suficientes" while the answer is still in the air — see loadTrend */
const showTrend = ref(false);

const all = ref([]);
const people = computed(() => {
  const named = new Map();
  for (const evaluation of all.value) {
    named.set(evaluation.subject.userId, evaluation.subject.name);
  }
  return [...named]
    .map(([userId, name]) => ({ userId, name }))
    .sort((first, second) => first.name.localeCompare(second.name));
});

/*
 * With a person chosen the server names the curve after them, so the card just borrows the name.
 *
 * Without one the server calls it "da equipe", which is only true for a reader who reaches the whole
 * team: the very same answer, given to somebody who leads one division, is the average of that branch
 * and of nothing else. So the reach from /development/scope goes into the title — this is the one
 * number on the screen that must never claim to count more than it counted.
 */
const trendTitle = computed(() => {
  const label = trend.value?.series?.[0]?.label;
  if (!label) return '';
  if (filterUser.value) return 'Autonomia de ' + label;
  if (!scope.value || scope.value.reach === 'TENANT' || !scope.value.reachLabel) return label;
  return 'Autonomia média — ' + scope.value.reachLabel;
});

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const [scopeAnswer, list] = await Promise.all([
      development.scope(auth.activeTenantId),
      development.evaluations(auth.activeTenantId),
    ]);
    scope.value = scopeAnswer.data;
    all.value = list.data;
    evaluations.value = filterUser.value
      ? list.data.filter((evaluation) => evaluation.subject.userId === filterUser.value)
      : list.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as avaliações'));
  }
  await loadTrend();
}

/*
 * The curve, asked for apart from the list so the page paints without waiting on it.
 *
 * A failure here hides the card and raises nothing, the way a secondary call does elsewhere in the
 * dashboard: the 403 of somebody who does not reach this team has already been answered by the list,
 * and a second red box says the same thing twice. The other case it swallows is a person who was
 * evaluated and then left the team — the list still shows their cycles, the server refuses to chart
 * somebody who is no longer a member, and the card simply is not there.
 */
async function loadTrend() {
  if (!auth.activeTenantId) return;
  const since = new Date();
  since.setDate(since.getDate() - TREND_DAYS); //Not a subtraction in milliseconds: DST
  try {
    const { data } = await development.evaluationTrend(auth.activeTenantId, {
      userId: filterUser.value || undefined,
      from: toDateInputValue(since),
    });
    trend.value = data;
    showTrend.value = true;
  } catch (error) {
    trend.value = null;
    showTrend.value = false;
  }
}

async function remove(evaluation) {
  if (!window.confirm(`Excluir a avaliação de ${evaluation.subject.name}?`)) return;
  try {
    await development.removeEvaluation(evaluation.evaluationId);
    await load();
    toast.info('Avaliação excluída.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir a avaliação'));
  }
}

function formatDate(value) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
}
</script>
