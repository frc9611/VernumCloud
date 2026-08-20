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

      <div class="vc-row" style="flex-wrap: wrap">
        <select v-if="scope?.reach !== 'SELF'" class="vc-select" style="max-width: 260px"
                v-model="filterUser" @change="load">
          <option value="">Todas as pessoas</option>
          <option v-for="person in people" :key="person" :value="person">{{ person }}</option>
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
            <template v-if="evaluation.author"> · por {{ evaluation.author.name }}</template>
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
import PanelCard from '@/components/PanelCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { development } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The history of the evaluation cycles the reader may see.
 *
 * The filter is by name and not by id because the list already carries the names it can show, and
 * asking the server for the members would need a permission this screen deliberately does not
 * require — a person with no permission at all still opens this and reads their own.
 */
const auth = authStore();
const toast = useToast();

const evaluations = ref([]);
const scope = ref(null);
const filterUser = ref('');

const people = computed(() =>
  [...new Set(all.value.map((evaluation) => evaluation.subject.name))].sort((a, b) => a.localeCompare(b)),
);
const all = ref([]);

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
      ? list.data.filter((evaluation) => evaluation.subject.name === filterUser.value)
      : list.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as avaliações'));
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
