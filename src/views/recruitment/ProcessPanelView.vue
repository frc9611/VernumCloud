<template>
  <main class="vc-page vc-page--wide">
    <TabBar v-model="statusFilter" :tabs="statusTabs">
      <template #context>
        <span class="vc-chip vc-chip--purple">{{ process.name }}</span>
        <span class="vc-chip">{{ process.statusLabel }}</span>
      </template>
    </TabBar>

    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Candidatos</h1>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'adminRecruitment' }">Voltar</router-link>
      </div>

      <div class="vc-row">
        <button
          v-for="stage in process.stages || []"
          :key="stage.recruitmentStageId"
          type="button"
          :class="['vc-chip', 'vc-chip--button', stageFilter === stage.recruitmentStageId ? 'vc-chip--purple' : '']"
          @click="toggleStage(stage.recruitmentStageId)"
        >
          {{ stage.position }}. {{ stage.name }} · {{ stage.candidateCount ?? 0 }}
        </button>
        <button v-if="stageFilter" class="vc-chip vc-chip--button" type="button" @click="stageFilter = null">
          Limpar etapa
        </button>
      </div>

      <EmptyState v-if="!entries.length" title="Nenhuma candidatura aqui">
        Compartilhe o link público do processo para receber inscrições.
      </EmptyState>

      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Candidato</th><th>E-mail</th><th>Divisões</th><th>Etapa</th>
              <th>Situação</th><th>Inscrição</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.recruitmentEntryId" class="is-clickable" @click="open(entry)">
              <td>
                <PersonLink :user-id="entry.userId" :name="entry.socialName || entry.name" />
                <span v-if="entry.userId" class="vc-chip vc-chip--info" title="Tem conta no Vernum">conta</span>
                <span v-else-if="entry.createdUsername" class="vc-chip vc-chip--info"
                      :title="'Conta criada: ' + entry.createdUsername">virou membro</span>
              </td>
              <td class="vc-faint">{{ entry.email }}</td>
              <td>
                <span v-for="division in entry.divisions" :key="division.divisionId" class="vc-chip" style="margin: 2px">
                  {{ division.visibleName }}
                </span>
                <span v-if="!entry.divisions.length" class="vc-faint">—</span>
              </td>
              <td>{{ entry.currentStageName || '—' }}</td>
              <td><span class="vc-badge" :class="badgeClass(entry.status)">{{ entry.statusLabel }}</span></td>
              <td class="vc-faint">{{ formatWhen(entry.submittedAt) }}</td>
              <td style="text-align: right">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click.stop="open(entry)">
                  Abrir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ------------------------------------------------------- candidate -->
    <ModalDialog v-if="selected" wide :title="selected.socialName || selected.name" @close="selected = null">
      <div class="vc-row">
        <span class="vc-badge" :class="badgeClass(selected.status)">{{ selected.statusLabel }}</span>
        <span v-if="selected.currentStageName" class="vc-chip vc-chip--purple">{{ selected.currentStageName }}</span>
        <span v-if="selected.userId" class="vc-chip vc-chip--info">tem conta no Vernum</span>
      </div>

      <div class="panel__facts">
        <div><span class="vc-label">Nome completo</span><p>{{ selected.name }}</p></div>
        <div><span class="vc-label">E-mail</span><p>{{ selected.email }}</p></div>
        <div><span class="vc-label">Telefone</span><p>{{ selected.phone || '—' }}</p></div>
        <div><span class="vc-label">Nascimento</span><p>{{ formatDate(selected.birthDate) }}</p></div>
        <div><span class="vc-label">Itinerário</span><p>{{ selected.course || '—' }}</p></div>
        <div><span class="vc-label">Sala e ano</span><p>{{ selected.schoolYear || '—' }}</p></div>
        <div><span class="vc-label">Estudante da instituição</span><p>{{ selected.sesiStudent ? 'Sim' : 'Não' }}</p></div>
        <div>
          <span class="vc-label">Divisões desejadas</span>
          <p>{{ selected.divisions.map((division) => division.visibleName).join(', ') || '—' }}</p>
        </div>
      </div>

      <div v-if="selected.motivation">
        <span class="vc-label">Motivação</span>
        <p class="vc-muted" style="margin: 4px 0 0">{{ selected.motivation }}</p>
      </div>

      <hr class="vc-divider" />

      <template v-if="canEvaluate">
        <div class="vc-field">
          <label class="vc-label" for="stage">Mover para a etapa</label>
          <div class="vc-input-group">
            <select id="stage" class="vc-select" v-model="moveStageId">
              <option :value="null">Escolha uma etapa</option>
              <option v-for="stage in process.stages || []" :key="stage.recruitmentStageId" :value="stage.recruitmentStageId">
                {{ stage.position }}. {{ stage.name }}
              </option>
            </select>
            <button class="vc-btn vc-btn--ghost" type="button" :disabled="!moveStageId" @click="moveStage">Mover</button>
          </div>
        </div>

        <div class="vc-field">
          <label class="vc-label" for="noteContent">Anotação</label>
          <textarea id="noteContent" class="vc-textarea" v-model="note.content"
                    placeholder="O que foi observado sobre o candidato."></textarea>
        </div>
        <div class="vc-row" style="gap: 14px; align-items: flex-end">
          <div class="vc-field" style="flex: 1">
            <label class="vc-label" for="noteDecision">Decisão desta anotação</label>
            <select id="noteDecision" class="vc-select" v-model="note.decision">
              <option value="NONE">Somente anotação</option>
              <option value="ADVANCED">Avançou de etapa</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Reprovado</option>
            </select>
          </div>
          <div class="vc-field" style="width: 110px">
            <label class="vc-label" for="noteScore">Nota (0-10)</label>
            <input id="noteScore" class="vc-input" type="number" min="0" max="10" v-model.number="note.score" />
          </div>
        </div>
        <label class="vc-checkbox">
          <input type="checkbox" v-model="note.visibleToCandidate" />
          Mostrar esta anotação para o candidato
        </label>
        <div>
          <button class="vc-btn vc-btn--outline" type="button" :disabled="!note.content.trim()" @click="addNote">
            Salvar anotação
          </button>
        </div>

        <hr class="vc-divider" />
      </template>

      <!-- ------------------------------------------------- approved -> member -->
      <template v-if="canConvert && selected.status === 'APPROVED'">
        <SectionTitle lead="Entrada na" title="Equipe" />
        <p v-if="selected.createdUsername" class="vc-muted" style="margin: 0">
          Conta criada: <strong>{{ selected.createdUsername }}</strong>.
        </p>
        <p v-else-if="selected.userId" class="vc-muted" style="margin: 0">
          O candidato já tinha conta no Vernum, então entra na equipe com ela.
        </p>
        <p v-else class="vc-muted" style="margin: 0">
          Criar a conta gera uma senha de uso único, que aparece uma vez só e vai na folha de
          boas-vindas para imprimir.
        </p>
        <div class="vc-row">
          <button class="vc-btn" type="button" :disabled="onboarding" @click="convert">
            {{ selected.createdUsername || selected.userId ? 'Garantir entrada na equipe' : 'Criar conta e colocar na equipe' }}
          </button>
          <button v-if="!selected.userId" class="vc-btn vc-btn--outline" type="button"
                  :disabled="onboarding" @click="printWelcome">
            Imprimir boas-vindas
          </button>
        </div>
        <p v-if="!selected.userId" class="vc-faint" style="margin: 0">
          Imprimir gera uma senha nova: a anterior para de valer. O servidor guarda só o hash dela,
          então não existe como reimprimir a mesma.
        </p>

        <hr class="vc-divider" />
      </template>

      <SectionTitle lead="Histórico de" title="Anotações" />
      <p v-if="!notes.length" class="vc-faint" style="margin: 0">Nenhuma anotação ainda.</p>
      <article v-for="item in notes" :key="item.recruitmentNoteId" class="panel__note">
        <div class="vc-row vc-row--between">
          <strong class="vc-small">{{ item.authorName || 'Sistema' }}</strong>
          <span class="vc-faint">{{ formatWhen(item.createdAt) }}</span>
        </div>
        <p style="margin: 4px 0">{{ item.content }}</p>
        <div class="vc-row">
          <span class="vc-chip">{{ item.decisionLabel }}</span>
          <span v-if="item.stageName" class="vc-chip">{{ item.stageName }}</span>
          <span v-if="item.score !== null && item.score !== undefined" class="vc-chip vc-chip--purple">
            Nota {{ item.score }}
          </span>
          <span v-if="item.visibleToCandidate" class="vc-chip vc-chip--info">visível ao candidato</span>
        </div>
      </article>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="selected = null">Fechar</button>
        <template v-if="canEvaluate">
          <button class="vc-btn vc-btn--danger" type="button" @click="decide(false)">Reprovar</button>
          <button class="vc-btn" type="button" @click="decide(true)">Aprovar</button>
        </template>
      </template>
    </ModalDialog>
    <!-- ------------------------------------------------------- credentials -->
    <ModalDialog v-if="credentials" title="Conta criada" @close="credentials = null">
      <AlertBanner variant="warning" icon="key" title="Anote agora">
        A senha aparece uma única vez. O servidor guarda só o hash dela — para ter a senha de novo,
        é gerar outra pela folha de boas-vindas.
      </AlertBanner>
      <div class="vc-field">
        <label class="vc-label" for="createdUsername">Usuário</label>
        <input id="createdUsername" class="vc-input" readonly :value="credentials.username" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="createdPassword">Senha de uso único</label>
        <input id="createdPassword" class="vc-input" readonly :value="credentials.password" />
      </div>
      <p class="vc-muted" style="margin: 0">
        {{ credentials.name }} entrou em {{ credentials.tenantName }}
        <template v-if="credentials.divisions.length">
          nas divisões {{ credentials.divisions.join(', ') }}
        </template>.
      </p>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="credentials = null">Fechar</button>
        <button class="vc-btn" type="button" @click="printWelcome">Imprimir boas-vindas</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import TabBar from '@/components/TabBar.vue';
import PersonLink from '@/components/PersonLink.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { recruitment } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The panel of one selection process: every submission, filtered by status or by etapa, and
 * the evaluation of a candidate with anotações and the approve/reprove decision.
 */
const auth = authStore();
const route = useRoute();
const toast = useToast();

const processId = route.params.id;
const process = ref({});
const entries = ref([]);
const statusFilter = ref('ALL');
const stageFilter = ref(null);

const selected = ref(null);
const notes = ref([]);
const moveStageId = ref(null);
const credentials = ref(null);
const onboarding = ref(false);
const note = reactive({ content: '', decision: 'NONE', score: null, visibleToCandidate: false });

const statusTabs = [
  { key: 'ALL', label: 'Todos' },
  { key: 'SUBMITTED', label: 'Novos' },
  { key: 'IN_REVIEW', label: 'Em avaliação' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'REJECTED', label: 'Reprovados' },
];

const canEvaluate = computed(() => auth.can('RECRUITMENT_EVALUATE'));
/* Turning a candidate into a member is two things at once, so it asks for both permissions. */
const canConvert = computed(() => auth.can('RECRUITMENT_EVALUATE') && auth.can('MEMBER_INVITE'));

onMounted(async () => {
  await loadProcess();
  await loadEntries();
});

watch([statusFilter, stageFilter], loadEntries);

async function loadProcess() {
  try {
    const { data } = await recruitment.process(processId);
    process.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar processo'));
  }
}

async function loadEntries() {
  try {
    const params = {};
    if (statusFilter.value !== 'ALL') params.status = statusFilter.value;
    if (stageFilter.value) params.stageId = stageFilter.value;
    const { data } = await recruitment.entries(processId, params);
    entries.value = data;
  } catch (error) {
    entries.value = [];
  }
}

function toggleStage(stageId) {
  stageFilter.value = stageFilter.value === stageId ? null : stageId;
}

async function open(entry) {
  try {
    const { data } = await recruitment.entry(entry.recruitmentEntryId);
    selected.value = data;
    notes.value = data.notes || [];
    moveStageId.value = data.currentStageId || null;
    Object.assign(note, { content: '', decision: 'NONE', score: null, visibleToCandidate: false });
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir candidatura'));
  }
}

async function refreshSelected() {
  const { data } = await recruitment.entry(selected.value.recruitmentEntryId);
  selected.value = data;
  notes.value = data.notes || [];
  await Promise.all([loadEntries(), loadProcess()]);
}

async function moveStage() {
  try {
    await recruitment.updateEntry(selected.value.recruitmentEntryId, { stageId: moveStageId.value });
    await refreshSelected();
    toast.success('Candidato movido de etapa!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mover candidato'));
  }
}

async function addNote() {
  try {
    await recruitment.addNote(selected.value.recruitmentEntryId, { ...note });
    Object.assign(note, { content: '', decision: 'NONE', score: null, visibleToCandidate: false });
    await refreshSelected();
    toast.success('Anotação salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar anotação'));
  }
}

/*
 * Approved candidate -> member of the team.
 *
 * The password comes back on this call and nowhere else, so it goes straight to a modal that
 * says so. Calling it again on somebody who already has an account changes nothing.
 */
async function convert() {
  onboarding.value = true;
  try {
    const { data } = await recruitment.convert(selected.value.recruitmentEntryId);
    await refreshSelected();
    if (data.password) {
      credentials.value = data;
    } else {
      toast.success(data.name + ' está na equipe.');
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao criar a conta do candidato'));
  } finally {
    onboarding.value = false;
  }
}

/** Downloads the welcome sheet. Every call draws a new one-time password. */
async function printWelcome() {
  onboarding.value = true;
  try {
    const response = await recruitment.welcomeSheet(selected.value.recruitmentEntryId);
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
    credentials.value = null;
    await refreshSelected();
    toast.success('Folha de boas-vindas gerada com uma senha nova.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar a folha de boas-vindas'));
  } finally {
    onboarding.value = false;
  }
}

async function decide(approve) {
  const text = window.prompt(approve ? 'Anotação da aprovação:' : 'Motivo da reprovação:') || '';
  const visible = window.confirm('Mostrar essa justificativa para o candidato?');
  try {
    const body = { note: text, visibleToCandidate: visible };
    if (approve) {
      await recruitment.approve(selected.value.recruitmentEntryId, body);
      toast.success('Candidato aprovado!');
    } else {
      await recruitment.reject(selected.value.recruitmentEntryId, body);
      toast.info('Candidato reprovado.');
    }
    await refreshSelected();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao registrar a decisão'));
  }
}

function badgeClass(status) {
  if (status === 'APPROVED') return 'vc-badge--on';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'vc-badge--off';
  if (status === 'IN_REVIEW') return 'vc-badge--purple';
  return 'vc-badge--neutral';
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '—';
}
</script>

<style scoped>
.panel__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 18px;
}

.panel__facts p {
  margin: 2px 0 0;
  font-size: 0.92rem;
}

.panel__note {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  padding: 10px 12px;
  background: var(--vc-surface);
}
</style>
