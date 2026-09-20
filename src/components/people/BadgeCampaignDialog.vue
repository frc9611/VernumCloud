<template>
  <ModalDialog wide :title="dialogTitle" @close="emit('close')">
    <!-- ------------------------------------------------------------- result -->
    <BadgeGrantResult v-if="result" :result="result" />

    <!-- --------------------------------------------------------------- form -->
    <div v-else class="vc-stack">
      <p v-if="editing" class="vc-callout" style="margin: 0">
        <strong>Correção:</strong> o novo título, a descrição, as cores e o ícone entram em todos os
        badges que esta concessão já deixou nos perfis. Quem recebe e o motivo não mudam.
      </p>

      <div v-if="!editing" class="vc-field">
        <label class="vc-label" for="bcd-kind">Tipo</label>
        <select id="bcd-kind" class="vc-select" v-model="form.kind">
          <option value="CUSTOM">Badge</option>
          <option value="ALUMNI">Alumni</option>
        </select>
        <span class="vc-faint">Badges de evento, de prêmio e de marco são gerados pela plataforma.</span>
      </div>

      <div class="vc-field">
        <label class="vc-label" for="bcd-title">Título</label>
        <input id="bcd-title" class="vc-input" type="text" maxlength="160" v-model="form.title"
               :placeholder="form.kind === 'ALUMNI' ? 'Alumni 2020–2024' : 'Temporada 2025'" />
        <span class="vc-faint">Um título já concedido em massa e ainda de pé é recusado pelo servidor.</span>
      </div>

      <div class="vc-field">
        <label class="vc-label" for="bcd-description">Descrição</label>
        <textarea id="bcd-description" class="vc-textarea" rows="2" maxlength="500" v-model="form.description"
                  placeholder="O fato que este badge marca. Ele fica no perfil público de quem recebe."></textarea>
        <span class="vc-faint">Obrigatória numa concessão em massa: ela vai para muita gente de uma vez.</span>
      </div>

      <div v-if="!editing" class="vc-field">
        <label class="vc-label" for="bcd-reason">Motivo</label>
        <textarea id="bcd-reason" class="vc-textarea" rows="2" maxlength="500" v-model="form.reason"
                  placeholder="Por que a equipe está concedendo isto agora."></textarea>
        <span :class="reasonTooShort ? 'vc-warning-text' : 'vc-faint'">
          Fica na trilha de auditoria. Pelo menos 10 caracteres — {{ form.reason.trim().length }} até aqui.
        </span>
      </div>

      <div class="bcd__fields">
        <div class="vc-field">
          <label class="vc-label" for="bcd-icon">Ícone</label>
          <select id="bcd-icon" class="vc-select" v-model="form.icon">
            <option v-for="choice in iconChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</option>
          </select>
        </div>
        <div v-if="!editing" class="vc-field">
          <label class="vc-label" for="bcd-frame">Moldura</label>
          <select id="bcd-frame" class="vc-select" v-model="form.frame">
            <option v-for="choice in frameChoices" :key="choice.value" :value="choice.value">{{ choice.label }}</option>
          </select>
        </div>
      </div>

      <div class="bcd__fields bcd__colors">
        <div class="vc-field">
          <label class="vc-label" for="bcd-color">Cor do ícone</label>
          <div class="vc-input-group">
            <input id="bcd-color" class="vc-input" type="color" v-model="form.color" :disabled="!form.useColor" />
            <label class="vc-checkbox" style="white-space: nowrap">
              <input type="checkbox" v-model="form.useColor" />
              cor própria
            </label>
          </div>
          <span class="vc-faint">Sem cor própria, o badge usa a cor da equipe.</span>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="bcd-text-color">Cor do título</label>
          <div class="vc-input-group">
            <input id="bcd-text-color" class="vc-input" type="color" v-model="form.textColor" :disabled="!form.useTextColor" />
            <label class="vc-checkbox" style="white-space: nowrap">
              <input type="checkbox" v-model="form.useTextColor" />
              cor própria
            </label>
          </div>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="bcd-bg-color">Cor de fundo</label>
          <div class="vc-input-group">
            <input id="bcd-bg-color" class="vc-input" type="color" v-model="form.backgroundColor" :disabled="!form.useBackgroundColor" />
            <label class="vc-checkbox" style="white-space: nowrap">
              <input type="checkbox" v-model="form.useBackgroundColor" />
              fundo próprio
            </label>
          </div>
        </div>
      </div>

      <div class="vc-row bcd__preview-row">
        <span class="vc-faint">Prévia:</span>
        <BadgeChip :badge="badgePreview" :color="badgePreviewColor" large />
      </div>

      <!-- ----------------------------------------------------------- audience -->
      <template v-if="!editing">
        <div class="vc-divider"></div>

        <div class="vc-field">
          <label class="vc-label" for="bcd-audience">Quem recebe</label>
          <select id="bcd-audience" class="vc-select" v-model="form.audience">
            <option
              v-for="choice in audienceChoices"
              :key="choice.value"
              :value="choice.value"
              :disabled="choice.value === 'DIVISION' && !canPickDivision"
            >
              {{ choice.label }}
            </option>
          </select>
          <span class="vc-faint">{{ audienceHint }}</span>
        </div>

        <div v-if="form.audience === 'DIVISION'" class="vc-field">
          <label class="vc-label" for="bcd-division">Divisão</label>
          <select id="bcd-division" class="vc-select" v-model="form.divisionId">
            <option value="">Escolha a divisão</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="String(division.divisionId)">
              {{ division.visibleName }}
            </option>
          </select>
          <span v-if="!divisionList.length" class="vc-faint">
            Esta equipe não tem divisões, ou você não pode lê-las.
          </span>
        </div>

        <div v-if="form.audience === 'SELECTED'" class="vc-field">
          <label class="vc-label" for="bcd-people">Pessoas</label>
          <div v-if="chosen.length" class="bcd__chosen">
            <span v-for="person in chosen" :key="person.userId" class="vc-chip vc-chip--purple">
              {{ person.name }}
              <button class="bcd__unchoose" type="button" :title="'Tirar ' + person.name + ' da lista'"
                      @click="unchoose(person)">
                <AppIcon name="close" :size="12" />
              </button>
            </span>
          </div>
          <input id="bcd-people" class="vc-input" type="text" autocomplete="off" v-model="search"
                 placeholder="Digite um nome ou usuário..." @input="scheduleSearch"
                 @keydown.escape="suggestions = []" />
          <div v-if="suggestions.length" class="bcd__suggest">
            <button v-for="person in suggestions" :key="person.userId" type="button"
                    class="bcd__suggest-item" @click="choose(person)">
              <strong>{{ person.name }}</strong>
              <span class="vc-faint">@{{ person.username }}</span>
            </button>
          </div>
          <span v-else-if="searching" class="vc-faint">Procurando...</span>
          <span v-else-if="searched && search.trim()" class="vc-faint">
            Ninguém com esse nome ao seu alcance, ou já está na lista.
          </span>
          <span class="vc-faint">
            Quem não for da equipe, estiver suspenso ou for convidado o servidor recusa, um a um.
          </span>
        </div>

        <!-- ------------------------------------------------------------ preview -->
        <div class="bcd__reach">
          <template v-if="!audienceReady">
            <AppIcon name="info" :size="16" />
            <span class="vc-faint">{{ audiencePending }}</span>
          </template>
          <template v-else-if="previewing">
            <AppIcon name="refresh" :size="16" />
            <span class="vc-faint">Conferindo quem o recorte alcança...</span>
          </template>
          <template v-else-if="previewFailed">
            <AppIcon name="alert" :size="16" />
            <span class="vc-warning-text">{{ previewFailed }}</span>
            <span class="vc-spacer"></span>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="runPreview">Tentar de novo</button>
          </template>
          <template v-else-if="preview">
            <AppIcon name="users" :size="16" />
            <span class="bcd__reach-count">
              alcança {{ preview.reached }} · {{ preview.alreadyHave }} já têm · {{ preview.willReceive }} recebem
            </span>
            <span v-if="preview.divisionName" class="vc-chip">{{ preview.divisionName }}</span>
          </template>
        </div>
        <p v-if="preview && preview.sample.length" class="vc-faint bcd__sample">
          {{ sampleNames }}
        </p>
        <p v-else-if="preview && !preview.reached" class="vc-warning-text bcd__sample">
          Este recorte não alcança ninguém — o servidor recusaria a concessão.
        </p>
      </template>
    </div>

    <template #footer>
      <template v-if="result">
        <button class="vc-btn" type="button" @click="emit('close')">Fechar</button>
      </template>
      <template v-else>
        <button class="vc-btn vc-btn--ghost" type="button" :disabled="busy" @click="emit('close')">Cancelar</button>
        <button v-if="editing" class="vc-btn" type="button" :disabled="busy || !canSave" @click="save">
          {{ busy ? 'Salvando...' : 'Salvar correção' }}
        </button>
        <button v-else class="vc-btn" type="button" :disabled="busy || !canGrant" :title="grantHint" @click="grant">
          {{ busy ? 'Concedendo...' : grantLabel }}
        </button>
      </template>
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { authStore } from '@/store/auth.js';
import { badgeCampaigns, divisions as divisionsApi, people as peopleApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import BadgeChip from './BadgeChip.vue';
import BadgeGrantResult from './BadgeGrantResult.vue';
import { BADGE_AUDIENCE_CHOICES, BADGE_FRAME_CHOICES, BADGE_ICON_CHOICES } from './profileText.js';

/*
 * Conceder um badge a muita gente de uma vez — or correct a concessão already made.
 *
 * The screen never computes who receives: it names a recorte and the server turns it into people,
 * both for the prévia and for the grant, with the very same code. That is why the "Conceder" button
 * stays disabled until the prévia answers — the blast radius of this dialog is a badge written into
 * the public profile of everybody it reaches, and the cheapest guard against a careless click is
 * showing the number and a few names of who is about to be reached, before the click.
 *
 * With a `campaign`, the dialog is the correção instead: the server rewrites título, descrição,
 * cores e ícone in every badge the concessão left, so the recorte, o motivo e a moldura are not
 * shown — they are not what PUT touches, and offering them would promise a change that never lands.
 */
const props = defineProps({
  tenantId: { type: Number, required: true },
  /** The concessão being corrected, or null to grant a new one. */
  campaign: { type: Object, default: null },
});
const emit = defineEmits(['close', 'done']);

const auth = authStore();
const toast = useToast();

const iconChoices = BADGE_ICON_CHOICES;
const frameChoices = BADGE_FRAME_CHOICES;
const audienceChoices = BADGE_AUDIENCE_CHOICES;

const SEARCH_DELAY_MS = 300;
const PREVIEW_DELAY_MS = 400;

const editing = computed(() => !!props.campaign);
const dialogTitle = computed(() =>
  editing.value ? `Corrigir "${props.campaign.title}"` : `Conceder badge em ${auth.activeTenantName}`,
);

const busy = ref(false);
const result = ref(null);

const form = reactive({
  kind: 'CUSTOM', title: '', description: '', reason: '',
  icon: 'badge', frame: 'NONE',
  color: '#8864ae', useColor: false,
  textColor: '#8864ae', useTextColor: false,
  backgroundColor: '#2a1f3d', useBackgroundColor: false,
  audience: 'EVERYONE', divisionId: '',
});

onMounted(() => {
  if (props.campaign) fillFrom(props.campaign);
  else loadDivisions();
});

/** Fills the form with a concessão, for the correção. */
function fillFrom(campaign) {
  form.kind = campaign.kind === 'ALUMNI' ? 'ALUMNI' : 'CUSTOM';
  form.title = campaign.title || '';
  form.description = campaign.description || '';
  form.reason = campaign.reason || '';
  form.icon = campaign.icon || 'badge';
  form.frame = campaign.frame || 'NONE';
  form.useColor = !!campaign.color;
  form.color = campaign.color || '#8864ae';
  form.useTextColor = !!campaign.textColor;
  form.textColor = campaign.textColor || '#8864ae';
  form.useBackgroundColor = !!campaign.backgroundColor;
  form.backgroundColor = campaign.backgroundColor || '#2a1f3d';
  form.audience = campaign.audience || 'EVERYONE';
  form.divisionId = campaign.divisionId ? String(campaign.divisionId) : '';
}

/* ------------------------------------------------------------------ preview chip */

const badgePreview = computed(() => ({
  kind: form.kind,
  kindLabel: form.kind === 'ALUMNI' ? 'Alumni' : 'Badge',
  title: form.title.trim() || 'Título do badge',
  description: form.description,
  icon: form.icon,
  frame: form.frame,
  textColor: form.useTextColor ? form.textColor : null,
  backgroundColor: form.useBackgroundColor ? form.backgroundColor : null,
  issuerName: auth.activeTenantName,
}));
const badgePreviewColor = computed(() => {
  if (form.useColor) return form.color;
  return auth.activeTenantColor || 'var(--vc-purple)';
});

/* ------------------------------------------------------------------ divisions */

const divisionList = ref([]);
const canPickDivision = computed(() => auth.can('DIVISION_VIEW'));

async function loadDivisions() {
  if (!canPickDivision.value) return;
  try {
    const { data } = await divisionsApi.list(props.tenantId);
    divisionList.value = data;
  } catch (error) {
    divisionList.value = [];
  }
}

/* -------------------------------------------------------------- people picker */

const chosen = ref([]);
const search = ref('');
const suggestions = ref([]);
const searching = ref(false);
const searched = ref(false);
let searchTimer = null;
let searchSequence = 0;

/** Waits for the typing to stop before asking the server. */
function scheduleSearch() {
  clearTimeout(searchTimer);
  searched.value = false;
  if (!search.value.trim()) {
    suggestions.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  searchTimer = setTimeout(runSearch, SEARCH_DELAY_MS);
}

async function runSearch() {
  const sequence = ++searchSequence;
  try {
    const { data } = await peopleApi.search(search.value.trim());
    //A slower answer to an older text must not overwrite the newer one
    if (sequence !== searchSequence) return;
    const taken = new Set(chosen.value.map((person) => person.userId));
    suggestions.value = data.filter((person) => !taken.has(person.userId));
  } catch (error) {
    if (sequence !== searchSequence) return;
    suggestions.value = [];
  } finally {
    if (sequence === searchSequence) {
      searching.value = false;
      searched.value = true;
    }
  }
}

function choose(person) {
  chosen.value = [...chosen.value, person];
  suggestions.value = [];
  search.value = '';
  searched.value = false;
}

function unchoose(person) {
  chosen.value = chosen.value.filter((item) => item.userId !== person.userId);
}

/* ----------------------------------------------------------- audience preview */

const preview = ref(null);
const previewing = ref(false);
const previewFailed = ref('');
let previewTimer = null;
let previewSequence = 0;

const audienceReady = computed(() => {
  if (form.audience === 'DIVISION') return !!form.divisionId;
  if (form.audience === 'SELECTED') return chosen.value.length > 0;
  return !!form.audience;
});

const audiencePending = computed(() => {
  if (form.audience === 'DIVISION') return 'Escolha a divisão para ver quem o recorte alcança.';
  if (form.audience === 'SELECTED') return 'Escolha pelo menos uma pessoa para ver a prévia.';
  return 'Escolha quem recebe.';
});

const audienceHint = computed(
  () => audienceChoices.find((choice) => choice.value === form.audience)?.hint || '',
);

const sampleNames = computed(() => {
  const names = (preview.value?.sample || []).map((person) => person.name).join(', ');
  const rest = (preview.value?.reached || 0) - (preview.value?.sample?.length || 0);
  return rest > 0 ? `${names} e mais ${rest}.` : `${names}.`;
});

/*
 * Anything that changes who is reached — or the título, which is what decides who already has it —
 * throws the prévia away at once and asks for a new one. Throwing it away is the point: a stale
 * prévia next to a changed recorte is exactly the mistake the prévia exists to prevent, so the
 * button locks again until the server answers about what is on the screen now.
 */
watch(
  [() => form.audience, () => form.divisionId, () => form.title, chosen],
  () => {
    if (editing.value) return;
    preview.value = null;
    previewFailed.value = '';
    clearTimeout(previewTimer);
    if (!audienceReady.value) {
      previewing.value = false;
      return;
    }
    previewing.value = true;
    previewTimer = setTimeout(runPreview, PREVIEW_DELAY_MS);
  },
  { immediate: true, deep: true },
);

async function runPreview() {
  if (!audienceReady.value) return;
  const sequence = ++previewSequence;
  previewing.value = true;
  previewFailed.value = '';
  try {
    const { data } = await badgeCampaigns.preview(props.tenantId, payload());
    if (sequence !== previewSequence) return;
    preview.value = data;
  } catch (error) {
    if (sequence !== previewSequence) return;
    preview.value = null;
    previewFailed.value = apiMessage(error, 'Não deu para conferir quem o recorte alcança.');
  } finally {
    if (sequence === previewSequence) previewing.value = false;
  }
}

onUnmounted(() => {
  clearTimeout(searchTimer);
  clearTimeout(previewTimer);
});

/* --------------------------------------------------------------------- write */

/** The MassGrantBadgeDto the server expects, out of the form. */
function payload() {
  return {
    kind: form.kind,
    title: form.title.trim(),
    description: form.description.trim() || null,
    reason: form.reason.trim() || null,
    color: form.useColor ? form.color : null,
    backgroundColor: form.useBackgroundColor ? form.backgroundColor : null,
    textColor: form.useTextColor ? form.textColor : null,
    frame: form.frame !== 'NONE' ? form.frame : null,
    icon: form.icon || null,
    audience: form.audience,
    divisionId: form.audience === 'DIVISION' && form.divisionId ? Number(form.divisionId) : null,
    userIds: form.audience === 'SELECTED' ? chosen.value.map((person) => person.userId) : null,
  };
}

const reasonTooShort = computed(() => form.reason.trim().length > 0 && form.reason.trim().length < 10);
const canSave = computed(() => !!form.title.trim() && !!form.description.trim());
const canGrant = computed(
  () => canSave.value
    && form.reason.trim().length >= 10
    && !!preview.value
    && preview.value.reached > 0,
);

const grantLabel = computed(() => {
  const receiving = preview.value?.willReceive;
  if (!receiving) return 'Conceder';
  return receiving === 1 ? 'Conceder a 1 pessoa' : `Conceder a ${receiving} pessoas`;
});

const grantHint = computed(() => {
  if (canGrant.value) return 'Concede o badge a quem o recorte alcança.';
  if (!form.title.trim()) return 'Falta o título.';
  if (!form.description.trim()) return 'Falta a descrição.';
  if (form.reason.trim().length < 10) return 'O motivo precisa de pelo menos 10 caracteres.';
  if (!preview.value) return 'Espere a prévia da audiência responder.';
  return 'Este recorte não alcança ninguém.';
});

async function grant() {
  busy.value = true;
  try {
    const { data } = await badgeCampaigns.grant(props.tenantId, payload());
    result.value = data;
    emit('done');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível conceder o badge.'));
  } finally {
    busy.value = false;
  }
}

async function save() {
  busy.value = true;
  try {
    await badgeCampaigns.update(props.tenantId, props.campaign.campaignId, payload());
    toast.success('Concessão corrigida em todos os badges.');
    emit('done');
    emit('close');
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível corrigir a concessão.'));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.bcd__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

/*
 * Three colour pickers side by side leave no room for "fundo próprio" next to the swatch, and the
 * label does not wrap on its own — so the switch drops under the swatch instead of running off the
 * edge of the dialog.
 */
.bcd__colors .vc-input-group {
  flex-wrap: wrap;
}

.bcd__preview-row {
  align-items: center;
  gap: 10px;
}

/* The reach of the grant, set apart from the fields: it is the answer, not another input. */
.bcd__reach {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--vc-border-strong);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
}

.bcd__reach-count {
  font-weight: 600;
  color: var(--vc-text);
}

.bcd__sample {
  margin: 0;
  font-size: 0.82rem;
}

.bcd__chosen {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.bcd__unchoose {
  display: inline-flex;
  align-items: center;
  border: 0;
  padding: 0;
  margin-left: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.bcd__suggest {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  max-height: 220px;
  overflow-y: auto;
}

.bcd__suggest-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: var(--vc-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.bcd__suggest-item:hover {
  background: var(--vc-purple-soft);
}
</style>
