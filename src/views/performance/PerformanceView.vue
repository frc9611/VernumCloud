<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Performance competitiva</h1>
        <span class="vc-chip vc-chip--purple">{{ module?.competitionCategoryLabel || '—' }}</span>
      </div>

      <AlertBanner v-if="module?.performanceStyle === 'NONE'" variant="warning"
                   title="Esta equipe não disputa nenhuma competição.">
        Escolha uma categoria em <router-link :to="{ name: 'adminFeatures' }">Recursos da equipe</router-link>
        e as áreas da liga aparecem aqui. Ou crie as suas à mão, logo abaixo.
      </AlertBanner>

      <!-- ------------------------------------------------------- command card -->
      <PanelCard title="Prontidão da equipe" icon="gauge" muted>
        <div class="vc-row" style="align-items: center; gap: 18px">
          <div class="vc-ring" :style="{ '--vc-ring-value': module?.readiness?.readinessScore || 0 }">
            <span class="vc-ring__text">
              <span class="vc-ring__value">{{ module?.readiness?.readinessScore ?? '—' }}</span>
              <span class="vc-ring__label">prontidão</span>
            </span>
          </div>
          <div style="flex: 1; min-width: 0">
            <p style="margin: 0 0 4px; font-weight: 600">
              {{ module?.readiness?.nextMilestone || 'Próximo marco a definir' }}
            </p>
            <div class="vc-row" style="flex-wrap: wrap">
              <span v-if="module?.readiness?.statusLabel" class="vc-chip">
                {{ module.readiness.statusLabel }}
              </span>
              <span class="vc-chip">autonomia {{ module?.readiness?.autonomy ?? '—' }}/4</span>
              <span class="vc-chip">entregas {{ module?.readiness?.deliveryRate ?? '—' }}%</span>
              <span class="vc-chip">confiabilidade {{ module?.reliability ?? 0 }}%</span>
            </div>
            <div v-if="module?.readiness?.priorities?.length" class="vc-row"
                 style="flex-wrap: wrap; margin-top: 8px">
              <span v-for="(priority, index) in module.readiness.priorities" :key="index"
                    class="vc-chip vc-chip--purple">
                {{ index + 1 }}. {{ priority }}
              </span>
            </div>
          </div>
        </div>
        <p class="vc-faint" style="font-size: 0.76rem">
          Estes números são digitados e assinados, não calculados: quão pronta a equipe está é um
          julgamento que alguém faz. O painel da equipe mostra os fatos ao lado deles.
          <template v-if="module?.readiness?.updatedBy">
            Último a assinar: {{ module.readiness.updatedBy.name }}.
          </template>
        </p>
        <template v-if="canManage" #footer>
          <button class="vc-btn vc-btn--outline" type="button" @click="openReadiness">
            Atualizar prontidão
          </button>
        </template>
      </PanelCard>

      <!-- ---------------------------------------------------------- evolution -->
      <PanelCard v-if="showEvolution" title="Evolução" icon="chart" muted>
        <div class="vc-row" style="flex-wrap: wrap; margin-bottom: 12px">
          <select class="vc-select" style="max-width: 190px" v-model.number="windowDays"
                  aria-label="Período do gráfico" @change="loadEvolution">
            <option :value="90">Últimos 90 dias</option>
            <option :value="180">Últimos 180 dias</option>
            <option :value="365">Último ano</option>
          </select>
          <button v-if="areaSeries.length" type="button"
                  :class="['vc-chip', 'vc-chip--button', byArea ? 'vc-chip--purple' : '']"
                  :aria-pressed="byArea ? 'true' : 'false'" @click="byArea = !byArea">
            por área
          </button>
          <span class="vc-spacer"></span>
        </div>

        <TrendChart :series="reliabilitySeries"
                    :title="byArea ? 'Confiabilidade da equipe e das áreas' : 'Confiabilidade da equipe'" />
        <!-- Points live in their own chart: they share the days but not the axis, and a run worth 210
             drawn against a scale that ends at 100 would leave the reliability as a flat line -->
        <TrendChart v-if="pointsSeries.length" :series="pointsSeries" title="Pontos por dia" />

        <p class="vc-faint" style="font-size: 0.76rem; margin: 12px 0 0">
          A nota de cada área e a prontidão são sobrescritas quando alguém digita a próxima, então não
          têm história para desenhar. O que tem é o que foi medido: cada ponto é o dia inteiro somado e
          depois dividido, como a confiabilidade lá em cima.
        </p>
      </PanelCard>

      <!-- -------------------------------------------------------------- areas -->
      <SectionTitle :lead="isMissions ? 'Rubricas' : 'Readiness por'"
                    :title="isMissions ? 'da Temporada' : 'Subsistema'">
        <template #actions>
          <button v-if="canManage" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openArea()">
            Nova área
          </button>
        </template>
      </SectionTitle>

      <PanelCard v-if="module?.areas?.length" :title="module.areas.length + ' área(s)'" muted>
        <div v-for="area in module.areas" :key="area.areaId" class="vc-scored">
          <span>
            {{ area.name }}
            <span v-if="area.statusLabel" class="vc-faint" style="font-size: 0.74rem">
              · {{ area.statusLabel }}
            </span>
          </span>
          <div :class="['vc-bar', barTone(area)]">
            <span :style="{ width: area.percent + '%' }"></span>
          </div>
          <strong>
            {{ format(area.score) }}/{{ format(area.maxScore) }}
            <button v-if="canManage" class="vc-btn vc-btn--icon" type="button" title="Editar"
                    style="margin-left: 6px" @click="openArea(area)">
              <AppIcon name="edit" :size="14" />
            </button>
          </strong>
        </div>
      </PanelCard>
      <EmptyState v-else title="Nenhuma área">
        {{ canManage
          ? 'Escolha a categoria de competição para receber as áreas da liga, ou crie as suas.'
          : 'Quem conduz a equipe define as áreas medidas.' }}
      </EmptyState>

      <!-- --------------------------------------------------------------- runs -->
      <SectionTitle lead="Registros" :title="isMissions ? 'de Run' : 'de Teste'">
        <template #actions>
          <span class="vc-chip">{{ module?.runCount || 0 }} registro(s)</span>
          <span v-if="isMissions && module?.totalPoints != null" class="vc-chip">
            {{ module.totalPoints }} pontos mapeados
          </span>
          <button v-if="canManage" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openRun">
            {{ isMissions ? 'Nova run' : 'Novo teste' }}
          </button>
        </template>
      </SectionTitle>

      <div v-if="module?.runs?.length" class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>{{ isMissions ? 'Run' : 'Teste' }}</th>
              <th v-if="!isMissions">Subsistema</th>
              <th v-if="isMissions">Pontos</th>
              <th v-if="isMissions">Tempo</th>
              <th>Sucessos</th>
              <th>Confiabilidade</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="run in module.runs" :key="run.runId">
              <td>
                {{ run.title }}
                <div v-if="run.notes" class="vc-faint" style="font-size: 0.75rem">{{ run.notes }}</div>
              </td>
              <td v-if="!isMissions">{{ run.areaName || '—' }}</td>
              <td v-if="isMissions">{{ run.points ?? '—' }}</td>
              <td v-if="isMissions">{{ run.durationSeconds != null ? run.durationSeconds + 's' : '—' }}</td>
              <td>{{ run.successes }}/{{ run.attempts }}</td>
              <td>
                <span :class="['vc-badge', run.reliability >= 95 ? 'vc-badge--on'
                  : run.reliability >= 80 ? 'vc-badge--neutral' : 'vc-badge--off']">
                  {{ run.reliability }}%
                </span>
              </td>
              <td class="vc-faint">{{ formatDate(run.runDate) }}</td>
              <td style="text-align: right">
                <button v-if="canManage" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                        @click="removeRun(run)">
                  Excluir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else title="Nada medido ainda">
        A confiabilidade é somada e depois dividida — 1/1 e 5/20 é 6 de 21, não a média das duas
        porcentagens.
      </EmptyState>
    </div>

    <!-- ---------------------------------------------------------- area modal -->
    <ModalDialog v-if="areaModal" :title="areaForm.areaId ? 'Editar área' : 'Nova área'"
                 @close="areaModal = false">
      <div class="vc-field">
        <label class="vc-label" for="aname">Nome</label>
        <input id="aname" class="vc-input" type="text" v-model="areaForm.name"
               :placeholder="isMissions ? 'Robot Design' : 'Mecânica'" />
      </div>
      <div class="vc-field" v-if="!areaForm.areaId">
        <label class="vc-label" for="akind">Escala</label>
        <select id="akind" class="vc-select" v-model="areaForm.kind">
          <option value="RUBRIC">Rubrica (0 a 4)</option>
          <option value="SUBSYSTEM">Subsistema (0 a 100)</option>
        </select>
        <span class="vc-faint">
          A escala não muda depois: um 2,8 que virasse 2,8 de 100 seria o mesmo número querendo dizer
          outra coisa.
        </span>
      </div>
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="ascore">Nota (0 a {{ areaMax }})</label>
          <input id="ascore" class="vc-input" type="number" step="0.1" min="0" :max="areaMax"
                 v-model.number="areaForm.score" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="astatus">Situação</label>
          <select id="astatus" class="vc-select" v-model="areaForm.status">
            <option value="EVOLVING">Em evolução</option>
            <option value="ATTENTION">Atenção</option>
            <option value="CRITICAL">Crítico</option>
            <option value="VALIDATED">Validado</option>
          </select>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="anotes">Observações</label>
        <textarea id="anotes" class="vc-textarea" v-model="areaForm.notes"></textarea>
      </div>
      <template #footer>
        <button v-if="areaForm.areaId" class="vc-btn vc-btn--danger" type="button" @click="removeArea">
          Excluir área
        </button>
        <span class="vc-spacer"></span>
        <button class="vc-btn vc-btn--ghost" type="button" @click="areaModal = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveArea">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ----------------------------------------------------------- run modal -->
    <ModalDialog v-if="runModal" :title="isMissions ? 'Nova run' : 'Novo teste'" @close="runModal = false">
      <div class="vc-field">
        <label class="vc-label" for="rtitle">Título</label>
        <input id="rtitle" class="vc-input" type="text" v-model="runForm.title"
               :placeholder="isMissions ? 'Run principal' : '20 ciclos do intake'" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="rarea">Área</label>
        <select id="rarea" class="vc-select" v-model="runForm.areaId">
          <option value="">{{ isMissions ? 'A temporada inteira' : 'Nenhuma' }}</option>
          <option v-for="area in module?.areas || []" :key="area.areaId" :value="area.areaId">
            {{ area.name }}
          </option>
        </select>
      </div>
      <div class="vc-grid">
        <div class="vc-field" v-if="isMissions">
          <label class="vc-label" for="rpoints">Pontos</label>
          <input id="rpoints" class="vc-input" type="number" v-model.number="runForm.points" />
        </div>
        <div class="vc-field" v-if="isMissions">
          <label class="vc-label" for="rtime">Tempo (s)</label>
          <input id="rtime" class="vc-input" type="number" min="0" v-model.number="runForm.durationSeconds" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="rsucc">Sucessos</label>
          <input id="rsucc" class="vc-input" type="number" min="0" v-model.number="runForm.successes" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="ratt">Tentativas</label>
          <input id="ratt" class="vc-input" type="number" min="1" v-model.number="runForm.attempts" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="rdate">Data</label>
          <input id="rdate" class="vc-input" type="date" v-model="runForm.runDate" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="rnotes">Observações</label>
        <textarea id="rnotes" class="vc-textarea" v-model="runForm.notes"
                  placeholder="Falhas, causas, ajustes e próximos testes..."></textarea>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="runModal = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveRun">Registrar</button>
      </template>
    </ModalDialog>

    <!-- ----------------------------------------------------- readiness modal -->
    <ModalDialog v-if="readinessModal" title="Prontidão da equipe" @close="readinessModal = false">
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="score">Prontidão (0 a 100)</label>
          <input id="score" class="vc-input" type="number" min="0" max="100"
                 v-model.number="readinessForm.readinessScore" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="aut">Autonomia da equipe (1 a 4)</label>
          <input id="aut" class="vc-input" type="number" step="0.1" min="1" max="4"
                 v-model.number="readinessForm.autonomy" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="delivery">Entregas (%)</label>
          <input id="delivery" class="vc-input" type="number" min="0" max="100"
                 v-model.number="readinessForm.deliveryRate" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="status">Situação</label>
          <select id="status" class="vc-select" v-model="readinessForm.status">
            <option value="GREEN">Estável</option>
            <option value="YELLOW">Atenção</option>
            <option value="RED">Crítico</option>
          </select>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="milestone">Próximo marco</label>
        <input id="milestone" class="vc-input" type="text" v-model="readinessForm.nextMilestone"
               placeholder="Robô consistente + portfólio" />
      </div>
      <div class="vc-field">
        <label class="vc-label">Prioridades do ciclo (no máximo 3)</label>
        <input v-for="index in 3" :key="index" class="vc-input" type="text"
               style="margin-bottom: 6px" v-model="readinessForm.priorities[index - 1]"
               :placeholder="'Prioridade ' + index" />
        <span class="vc-faint">Uma equipe com sete prioridades não tem nenhuma.</span>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="readinessModal = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="saveReadiness">Salvar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import TrendChart from '@/components/TrendChart.vue';
import { authStore } from '@/store/auth.js';
import { performance as performanceApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

/*
 * The performance module, whatever the team competes in.
 *
 * One call answers the whole thing, and `performanceStyle` decides which fields the screen asks
 * for: a league scored by mission runs wants points and a time, one scored by subsystems wants
 * which subsystem was tested. Same two tables underneath either way.
 */
const auth = authStore();
const toast = useToast();

const module = ref(null);
const evolution = ref(null);
/* The card appears only once a curve has actually come back: it starts hidden so the screen never
 * flashes "sem registros suficientes" while the call is still in the air, and goes back to hidden
 * when the call fails — see loadEvolution */
const showEvolution = ref(false);
const windowDays = ref(180);
const byArea = ref(false);
const areaModal = ref(false);
const runModal = ref(false);
const readinessModal = ref(false);

const areaForm = reactive({ areaId: null, name: '', kind: 'SUBSYSTEM', score: 0, status: 'EVOLVING', notes: '' });
const runForm = reactive({ areaId: '', title: '', points: null, durationSeconds: null,
  successes: 0, attempts: 1, runDate: toDateInputValue(new Date()), notes: '' });
const readinessForm = reactive({ readinessScore: null, autonomy: null, deliveryRate: null,
  nextMilestone: '', status: 'YELLOW', priorities: ['', '', ''] });

const canManage = computed(() => auth.can('PERFORMANCE_MANAGE'));
const seriesOf = (test) => (evolution.value?.series || []).filter((one) => test(one.key));
const teamSeries = computed(() => seriesOf((key) => key === 'team'));
const areaSeries = computed(() => seriesOf((key) => key.startsWith('area:')));
/* Only when something actually scored: a league of missions always answers this series, and an
 * empty second chart repeating "sem registros" under the first one says nothing twice. */
const pointsSeries = computed(() =>
  seriesOf((key) => key === 'points').filter((one) => (one.points || []).length > 0));
/*
 * The team alone by default. Eight subsystems at once is a plate of spaghetti nobody reads, so the
 * areas are one click away instead of one glance away — and the button only exists when there are any.
 */
const reliabilitySeries = computed(() =>
  (byArea.value ? [...teamSeries.value, ...areaSeries.value] : teamSeries.value));
const isMissions = computed(() => module.value?.performanceStyle === 'MISSIONS');
const areaMax = computed(() => (areaForm.kind === 'RUBRIC' ? 4 : 100));

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await performanceApi.module(auth.activeTenantId);
    module.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar a performance'));
  }
  await loadEvolution();
}

/*
 * The curve, asked for separately from the module so the page paints without waiting on it.
 *
 * A failure here hides the card instead of raising a toast: this is the secondary call of the screen,
 * the way the apps list is on the API keys screen. The case that matters is the 403 of somebody who
 * opened the page through another route and does not read this team's performance — being told twice
 * helps nobody, and a chart that nobody asked for is not worth a red box over the page.
 */
async function loadEvolution() {
  if (!auth.activeTenantId) return;
  const since = new Date();
  since.setDate(since.getDate() - windowDays.value); //Not a subtraction in milliseconds: DST
  try {
    const { data } = await performanceApi.evolution(auth.activeTenantId, {
      from: toDateInputValue(since),
    });
    evolution.value = data;
    showEvolution.value = true;
  } catch (error) {
    evolution.value = null;
    showEvolution.value = false;
  }
}

function barTone(area) {
  if (area.percent >= 80) return 'vc-bar--success';
  if (area.percent >= 55) return 'vc-bar--warning';
  return 'vc-bar--danger';
}

function format(value) {
  if (value == null) return '—';
  return Number.isInteger(value) ? value : Number(value).toFixed(1);
}

function formatDate(value) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
}

function openArea(area) {
  Object.assign(areaForm, area
    ? { areaId: area.areaId, name: area.name, kind: area.kind, score: area.score ?? 0,
        status: area.status || 'EVOLVING', notes: area.notes || '' }
    : { areaId: null, name: '', kind: isMissions.value ? 'RUBRIC' : 'SUBSYSTEM', score: 0,
        status: 'EVOLVING', notes: '' });
  areaModal.value = true;
}

async function saveArea() {
  const body = { name: areaForm.name, score: areaForm.score, status: areaForm.status,
    notes: areaForm.notes || null };
  try {
    if (areaForm.areaId) {
      await performanceApi.updateArea(areaForm.areaId, body);
    } else {
      await performanceApi.createArea(auth.activeTenantId, { ...body, kind: areaForm.kind });
    }
    areaModal.value = false;
    await load();
    toast.success('Área salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a área'));
  }
}

async function removeArea() {
  if (!window.confirm(`Excluir a área "${areaForm.name}"?`)) return;
  try {
    await performanceApi.removeArea(areaForm.areaId);
    areaModal.value = false;
    await load();
    toast.info('Área excluída.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir a área'));
  }
}

function openRun() {
  Object.assign(runForm, { areaId: '', title: '', points: null, durationSeconds: null,
    successes: 0, attempts: 1, runDate: toDateInputValue(new Date()), notes: '' });
  runModal.value = true;
}

async function saveRun() {
  try {
    await performanceApi.createRun(auth.activeTenantId, {
      areaId: runForm.areaId || null,
      title: runForm.title,
      points: isMissions.value ? runForm.points : null,
      durationSeconds: isMissions.value ? runForm.durationSeconds : null,
      successes: runForm.successes,
      attempts: runForm.attempts,
      runDate: runForm.runDate,
      notes: runForm.notes || null,
    });
    runModal.value = false;
    await load();
    toast.success('Registro salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao registrar'));
  }
}

async function removeRun(run) {
  if (!window.confirm(`Excluir o registro "${run.title}"?`)) return;
  try {
    await performanceApi.removeRun(run.runId);
    await load();
    toast.info('Registro excluído.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir o registro'));
  }
}

function openReadiness() {
  const current = module.value?.readiness || {};
  Object.assign(readinessForm, {
    readinessScore: current.readinessScore,
    autonomy: current.autonomy,
    deliveryRate: current.deliveryRate,
    nextMilestone: current.nextMilestone || '',
    status: current.status || 'YELLOW',
    priorities: [0, 1, 2].map((index) => (current.priorities || [])[index] || ''),
  });
  readinessModal.value = true;
}

async function saveReadiness() {
  try {
    await performanceApi.updateReadiness(auth.activeTenantId, {
      readinessScore: readinessForm.readinessScore,
      autonomy: readinessForm.autonomy,
      deliveryRate: readinessForm.deliveryRate,
      nextMilestone: readinessForm.nextMilestone || null,
      status: readinessForm.status,
      priorities: readinessForm.priorities.filter((priority) => priority && priority.trim()),
    });
    readinessModal.value = false;
    await load();
    toast.success('Prontidão atualizada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a prontidão'));
  }
}
</script>
