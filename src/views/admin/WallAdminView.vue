<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Mural ao vivo</h1>
        <span v-if="auth.activeTenantName" class="vc-chip vc-chip--purple">{{ auth.activeTenantName }}</span>
      </div>

      <p v-if="loading" class="vc-faint">Carregando o mural...</p>

      <EmptyState v-else-if="switchedOff" title="O mural ao vivo está desligado nesta equipe">
        Quem administra a equipe liga o recurso em "Recursos da equipe". Enquanto isso, quem abre o
        endereço do mural vê "Mural indisponível".
      </EmptyState>

      <EmptyState v-else-if="!config" title="Não deu para carregar o mural">
        Tente de novo em instantes.
        <template #actions>
          <button class="vc-btn vc-btn--ghost" type="button" @click="load">Tentar de novo</button>
        </template>
      </EmptyState>

      <template v-else>
        <AlertBanner variant="info" title="Uma tela, sem ninguém tocando nela." icon="monitor">
          O mural é feito para ficar horas numa TV da sala: abra o endereço abaixo no navegador da
          televisão, em tela cheia. Ele não pede login e se atualiza sozinho.
        </AlertBanner>

        <!-- ------------------------------------------------------------ live events -->
        <!-- First on the screen because it is the button somebody looks for with the room watching -->
        <PanelCard title="Disparar na TV" icon="megaphone">
          <p class="vc-muted note">
            O evento toma a tela inteira do mural, com o título gigante, e sai sozinho quando a
            duração acaba.
          </p>

          <div class="shortcuts">
            <button v-for="shortcut in SHORTCUTS" :key="shortcut.title" class="vc-btn vc-btn--outline vc-btn--small"
                    type="button" @click="useShortcut(shortcut)">
              {{ shortcut.title }}
            </button>
          </div>

          <div class="event-form">
            <div class="vc-field">
              <label class="vc-label" for="event-kind">Tipo</label>
              <select id="event-kind" class="vc-select" v-model="eventForm.kind" @change="suggestColor">
                <option v-for="kind in KINDS" :key="kind.value" :value="kind.value">{{ kind.label }}</option>
              </select>
            </div>
            <div class="vc-field">
              <label class="vc-label" for="event-color">Cor</label>
              <div class="vc-input-group">
                <input id="event-color" class="vc-input color-input" type="color" v-model="eventForm.color" />
                <input class="vc-input" type="text" v-model="eventForm.color" maxlength="7" aria-label="Cor em hexadecimal" />
              </div>
            </div>
            <div class="vc-field">
              <label class="vc-label" for="event-duration">Duração (segundos)</label>
              <input id="event-duration" class="vc-input" type="number" min="5" max="3600"
                     v-model.number="eventForm.durationSeconds" />
            </div>
            <div class="vc-field event-form__wide">
              <label class="vc-label" for="event-title">Título</label>
              <input id="event-title" class="vc-input" type="text" v-model="eventForm.title" maxlength="120"
                     placeholder="Ex.: Inspeção começa agora" />
            </div>
            <div class="vc-field event-form__wide">
              <label class="vc-label" for="event-message">Mensagem</label>
              <textarea id="event-message" class="vc-textarea" v-model="eventForm.message" maxlength="400"
                        rows="2" placeholder="Ex.: Levem o robô e a bateria carregada."></textarea>
            </div>
          </div>

          <template #footer>
            <span class="vc-faint">{{ eventForm.durationSeconds || 0 }}s na tela</span>
            <span class="vc-spacer"></span>
            <button class="vc-btn fire" type="button" :disabled="!canFire || firing" @click="fire">
              <AppIcon name="megaphone" :size="17" />
              Disparar na TV
            </button>
          </template>
        </PanelCard>

        <PanelCard v-if="config.recentEvents && config.recentEvents.length" title="Disparados recentemente"
                   icon="history" muted>
          <div class="vc-list">
            <div v-for="event in config.recentEvents" :key="event.eventId" class="vc-list__item vc-list__item--plain">
              <span class="dot" :style="{ background: event.color || 'var(--vc-purple)' }"></span>
              <div class="vc-list__text">
                <strong>{{ event.title }}</strong>
                <span>{{ event.kindLabel }} · {{ formatDateTime(event.createdAt) }}</span>
              </div>
              <span v-if="onScreen(event)" class="vc-badge vc-badge--on">na tela</span>
              <button v-if="onScreen(event)" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="dismiss(event)">
                Tirar da tela
              </button>
            </div>
          </div>
        </PanelCard>

        <!-- ------------------------------------------------------------ the address -->
        <PanelCard title="Endereço da TV" icon="monitor" muted>
          <div class="vc-switch">
            <div class="vc-switch__body">
              <strong>Mural ligado</strong>
              <p>Desligado, o endereço para de responder e a televisão mostra "Mural indisponível".</p>
            </div>
            <button type="button" :class="['vc-switch__toggle', form.enabled ? 'is-on' : '']"
                    :aria-pressed="form.enabled ? 'true' : 'false'" @click="form.enabled = !form.enabled">
              <AppIcon :name="form.enabled ? 'toggleOn' : 'toggleOff'" :size="18" />
              {{ form.enabled ? 'Ligado' : 'Desligado' }}
            </button>
          </div>

          <div class="vc-field">
            <label class="vc-label" for="wall-url">Link da TV</label>
            <div class="vc-input-group">
              <input id="wall-url" class="vc-input" type="text" readonly :value="wallUrl" />
              <button class="vc-btn vc-btn--icon" type="button" aria-label="Copiar link" title="Copiar link"
                      @click="copy(wallUrl)">
                <AppIcon name="copy" :size="16" />
              </button>
              <a class="vc-btn vc-btn--outline open-link" :href="wallUrl" target="_blank" rel="noopener">Abrir</a>
            </div>
            <p class="vc-faint hint">
              Qualquer pessoa com este link vê o mural, sem conta. Trate-o como o endereço de uma
              página pública.
            </p>
          </div>

          <template #footer>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="regenerating"
                    @click="regenerate">
              Gerar link novo
            </button>
            <span class="vc-faint hint">o link antigo para de valer na hora</span>
          </template>
        </PanelCard>

        <!-- ------------------------------------------------------------- countdown -->
        <PanelCard title="Cronômetro" icon="clock" muted>
          <div class="vc-field">
            <label class="vc-label" for="countdown-task">Demanda</label>
            <select id="countdown-task" class="vc-select" v-model="form.countdownTaskId" @change="suggestTarget">
              <option :value="null">Nenhuma — só o rótulo abaixo</option>
              <option v-for="task in tasks" :key="task.taskId" :value="task.taskId">
                {{ task.title }}<template v-if="task.dueDate"> · {{ formatDate(task.dueDate) }}</template>
              </option>
            </select>
            <p class="vc-faint hint">
              A demanda dá o nome do que está sendo contado; o campo abaixo dá a hora exata do fim.
              Escolher uma demanda com prazo já sugere as 23:59 daquele dia.
            </p>
          </div>

          <!-- The hour typed here is the hour of whoever types it, and only a foreign zone makes that worth saying -->
          <AlertBanner v-if="zoneNote" variant="warning" title="Horários no fuso deste computador.">
            Você está vendo e digitando {{ zoneNote }}, e não no de Brasília. A hora que marcar como
            fim da contagem é a hora daqui — na TV ela aparece no fuso de quem estiver olhando.
          </AlertBanner>

          <div class="vc-split">
            <div class="vc-field">
              <label class="vc-label" for="countdown-target">Fim da contagem</label>
              <input id="countdown-target" class="vc-input" type="datetime-local" v-model="form.countdownTarget" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="countdown-label">Rótulo</label>
              <input id="countdown-label" class="vc-input" type="text" v-model="form.countdownLabel"
                     maxlength="120" placeholder="Entrega do robô" />
            </div>
          </div>
        </PanelCard>

        <!-- ---------------------------------------------------------------- panels -->
        <PanelCard title="O que aparece na TV" icon="sliders" muted>
          <p class="vc-muted note">Na ordem em que estão aqui.</p>
          <label v-for="panel in PANELS" :key="panel.value" class="vc-checkbox">
            <input type="checkbox" :value="panel.value" v-model="form.panels" />
            <span>
              <strong>{{ panel.label }}</strong>
              <span class="vc-faint panel-hint"> — {{ panel.hint }}</span>
            </span>
          </label>

          <!--
            Only while the corrida is on: the window is a setting of that panel and nothing else
            reads it, so an unchecked race leaves a field on the card that changes nothing. The value
            typed before is kept and saved all the same, and comes back with the checkbox.

            Same care as the countdown above: the hour typed here is the hour of this computer.
          -->
          <div v-if="form.panels.includes('race')" class="vc-field race-window">
            <label class="vc-label" for="race-since">Início da janela da corrida</label>
            <input id="race-since" class="vc-input" type="datetime-local" v-model="form.raceSince" />
            <p class="vc-faint hint">
              A corrida só conta as demandas concluídas a partir desta hora. Em branco, ela olha as
              últimas 24 horas.
              <template v-if="zoneNote">A hora é a que você digita {{ zoneNote }}.</template>
            </p>
          </div>
        </PanelCard>

        <div class="vc-row">
          <span class="vc-spacer"></span>
          <button class="vc-btn" type="button" :disabled="saving" @click="save">Salvar mural</button>
        </div>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import { authStore } from '@/store/auth.js';
import { tasks as tasksApi, wall } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import {
  formatDate, formatDateTime as formatMoment, fromInputValue, parseServer, toInputValue, zoneNotice,
} from '@/services/time.js';

/*
 * The wall from the side of whoever runs the room.
 *
 * The live events come first on purpose: everything else here is set up once at the start of the
 * marathon, while the events are what somebody comes looking for with thirty people in the room and
 * ten minutes to say something. The countdown is two fields and not one because the demanda names
 * what is being counted and only a datetime says the exact minute it ends — a deadline is a day.
 */
const auth = authStore();
const toast = useToast();

const KINDS = [
  { value: 'INFO', label: 'Aviso', color: '#4c6ef5' },
  { value: 'ALERT', label: 'Atenção', color: '#e8590c' },
  { value: 'CELEBRATION', label: 'Comemoração', color: '#2f9e44' },
  { value: 'MILESTONE', label: 'Marco', color: '#7048e8' },
];

const PANELS = [
  { value: 'countdown', label: 'Cronômetro', hint: 'a contagem grande no centro' },
  {
    value: 'race',
    label: 'Corrida entre divisões',
    hint: 'uma faixa por divisão, com o que cada uma concluiu dentro da janela',
  },
  { value: 'kanban', label: 'Quadro de demandas', hint: 'uma coluna por status' },
  { value: 'announcements', label: 'Avisos', hint: 'os avisos mais recentes da equipe' },
  { value: 'updates', label: 'Atualizações', hint: 'a linha do tempo do que acabou de acontecer' },
  { value: 'room', label: 'Na sala', hint: 'quem está presente agora' },
  { value: 'stats', label: 'Números', hint: 'a faixa de estatísticas do rodapé' },
];

/* The vocabulary, in the order the television reads it: what a saved list is sorted back into. */
const PANEL_ORDER = PANELS.map((panel) => panel.value);

/*
 * What a wall that was never configured shows. The race is the one panel left out of it: the murals
 * already hanging in rooms were set up before it existed, and a panel that switches itself on would
 * rearrange a screen nobody asked to have rearranged.
 */
const DEFAULT_PANELS = PANEL_ORDER.filter((panel) => panel !== 'race');

/* The shots somebody fires in the middle of a marathon, ready to go with one click plus "Disparar" */
const SHORTCUTS = [
  { kind: 'ALERT', title: 'Faltam 30 minutos!', message: 'Fechem o que estiver aberto e levem o robô para a inspeção.', color: '#e8590c', durationSeconds: 60 },
  { kind: 'INFO', title: 'Pausa para o almoço', message: 'Meia hora. Voltem no horário para não atrasar os testes.', color: '#4c6ef5', durationSeconds: 45 },
  { kind: 'CELEBRATION', title: 'Robô ligou!', message: 'Primeira ligação sem fumaça. Parabéns, elétrica.', color: '#2f9e44', durationSeconds: 30 },
  { kind: 'MILESTONE', title: 'Autônomo aprovado', message: 'Passou nas três tentativas seguidas.', color: '#7048e8', durationSeconds: 30 },
];

const config = ref(null);
const tasks = ref([]);
const loading = ref(true);
const switchedOff = ref(false);
const saving = ref(false);
const firing = ref(false);
const regenerating = ref(false);
/* Empty on a computer in UTC-3, which is what keeps the warning about the typed hour out of the way. */
const zoneNote = zoneNotice();

const form = reactive({
  enabled: true,
  countdownLabel: '',
  countdownTarget: '',
  countdownTaskId: null,
  panels: [...DEFAULT_PANELS],
  raceSince: '',
});

const eventForm = reactive({
  kind: 'INFO',
  title: '',
  message: '',
  color: '#4c6ef5',
  durationSeconds: 45,
});

const wallUrl = computed(() =>
  config.value?.publicToken ? window.location.origin + '/mural/' + config.value.publicToken : '',
);

const canFire = computed(() => !!eventForm.title.trim() && eventForm.durationSeconds > 0);

/* Ticks so an event leaves the "na tela" list by itself, the same second it leaves the television */
const nowMs = ref(Date.now());
let tick = null;

onMounted(() => {
  tick = setInterval(() => (nowMs.value = Date.now()), 1000);
  load();
});

onUnmounted(() => clearInterval(tick));

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  switchedOff.value = false;
  try {
    const { data } = await wall.config(auth.activeTenantId);
    applyConfig(data);
  } catch (error) {
    config.value = null;
    //A switched off feature answers 403; that is "desligado", not an error to toast
    if (!auth.featureOn('LIVE_WALL')) {
      switchedOff.value = true;
    } else {
      toast.error(apiMessage(error, 'Erro ao carregar o mural'));
    }
  } finally {
    loading.value = false;
  }
  loadTasks();
}

async function loadTasks() {
  if (!auth.activeTenantId || !auth.featureOn('TASKS')) return;
  try {
    const { data } = await tasksApi.list(auth.activeTenantId);
    tasks.value = data;
  } catch (error) {
    //The countdown still works with a free label: the demanda only lends it a name
    tasks.value = [];
  }
}

/** Takes the wall as the server answered it and resets the form to it. */
function applyConfig(data) {
  config.value = data;
  form.enabled = data.enabled !== false;
  form.countdownLabel = data.countdownLabel || '';
  form.countdownTarget = toInputValue(data.countdownTarget);
  form.countdownTaskId = data.countdownTaskId ?? null;
  form.panels = data.panels && data.panels.length ? [...data.panels] : [...DEFAULT_PANELS];
  form.raceSince = toInputValue(data.raceSince);
}

async function save() {
  saving.value = true;
  try {
    const { data } = await wall.save(auth.activeTenantId, {
      enabled: form.enabled,
      countdownLabel: form.countdownLabel.trim() || null,
      countdownTarget: fromInputValue(form.countdownTarget),
      countdownTaskId: form.countdownTaskId ?? null,
      //Send the vocabulary in the order the checkboxes are listed, not in the order they were clicked
      panels: PANEL_ORDER.filter((panel) => form.panels.includes(panel)),
      //Blank is not "leave it alone": it is the corrida going back to the last 24 hours
      raceSince: fromInputValue(form.raceSince),
    });
    applyConfig(data);
    toast.success('Mural salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o mural'));
  } finally {
    saving.value = false;
  }
}

async function regenerate() {
  if (!window.confirm('Gerar um link novo? O endereço de agora para de valer e a televisão que estiver aberta nele fica sem mural até receber o novo.')) {
    return;
  }
  regenerating.value = true;
  try {
    const { data } = await wall.newToken(auth.activeTenantId);
    applyConfig(data);
    toast.success('Link novo gerado. Abra-o na televisão.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar o link'));
  } finally {
    regenerating.value = false;
  }
}

/* ------------------------------------------------------------------ live events */

function useShortcut(shortcut) {
  Object.assign(eventForm, shortcut);
}

/* Each kind has a colour people already read as its meaning; picking one moves the swatch with it */
function suggestColor() {
  const kind = KINDS.find((item) => item.value === eventForm.kind);
  if (kind) {
    eventForm.color = kind.color;
  }
}

async function fire() {
  firing.value = true;
  try {
    await wall.fire(auth.activeTenantId, {
      kind: eventForm.kind,
      title: eventForm.title.trim(),
      message: eventForm.message.trim() || null,
      color: eventForm.color || null,
      durationSeconds: eventForm.durationSeconds,
    });
    await refreshEvents();
    toast.success('Está na tela.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao disparar o evento'));
  } finally {
    firing.value = false;
  }
}

async function dismiss(event) {
  try {
    await wall.dismiss(event.eventId);
    await refreshEvents();
    toast.info('Evento tirado da tela.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao tirar o evento da tela'));
  }
}

/*
 * Firing or taking an event off changes the history and nothing else, so it is read back on its own
 * instead of through load(): that one puts the whole page back on "Carregando o mural..." and, worse,
 * resets the form from the server — somebody who had just changed the clock or the panels and fired
 * an alert before saving would watch the change disappear without being told.
 */
async function refreshEvents() {
  try {
    const { data } = await wall.config(auth.activeTenantId);
    config.value = data;
  } catch (error) {
    //The event is already on the television; only its line in the history is late
  }
}

/** Whether the event is still covering the wall — only those can be taken off it. */
function onScreen(event) {
  const ends = parseServer(event.expiresAt);
  return !!ends && ends.getTime() > nowMs.value;
}

/* -------------------------------------------------------------------- helpers */

/* A deadline is a day, so the end of it is the natural guess for the exact minute of the countdown. */
function suggestTarget() {
  if (!form.countdownTaskId) return;
  const task = tasks.value.find((item) => item.taskId === form.countdownTaskId);
  if (task?.dueDate && !form.countdownTarget) {
    form.countdownTarget = String(task.dueDate).slice(0, 10) + 'T23:59';
  }
}

function formatDateTime(value) {
  return formatMoment(value) || '—';
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Link copiado!');
  } catch (error) {
    toast.warning('Não deu para copiar. Selecione o endereço e copie manualmente.');
  }
}
</script>

<style scoped>
.note {
  margin: 0 0 10px;
  font-size: 0.84rem;
}

.hint {
  margin: 4px 0 0;
  font-size: 0.76rem;
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.event-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
}

.event-form__wide {
  grid-column: 1 / -1;
}

/* The colour picker is a swatch, not a field: it only needs to be as wide as the square */
.color-input {
  flex: none;
  width: 52px;
  padding: 2px 4px;
}

.fire {
  font-size: 1rem;
  padding: 10px 20px;
}

.open-link {
  white-space: nowrap;
}

.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.panel-hint {
  font-size: 0.78rem;
}

/* The checkboxes are a list to read top to bottom, so they get air the base class does not have */
.vc-checkbox {
  padding: 5px 0;
}

/* Reads as a setting of the checkbox above it, not as a card of its own: same air the list has, and
   only as wide as a datetime needs so it does not look like the main field of the panel */
.race-window {
  margin-top: 10px;
  max-width: 320px;
}

@media (max-width: 720px) {
  .event-form {
    grid-template-columns: 1fr;
  }
}
</style>
