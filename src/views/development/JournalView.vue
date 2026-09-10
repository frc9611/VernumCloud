<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Caderno do técnico</h1>
        <button v-if="scope?.canWriteJournal" class="vc-btn" type="button" @click="openCreate">
          Novo registro
        </button>
      </div>

      <AlertBanner variant="info" title="O único lugar escrito para quem escreve." icon="notebook"
                   :aside="entries.length + ' registro(s)'">
        Uma demanda é para a equipe, um aviso é para quem recebe, uma avaliação é para a pessoa
        avaliada. Aqui é onde quem conduz a equipe registra o que decidiu e por quê, para a próxima
        temporada não ser decidida de memória. Quem escreveu sempre lê de volta.
      </AlertBanner>

      <div class="vc-split">
        <div class="vc-stack">
          <div class="vc-row" style="flex-wrap: wrap">
            <select class="vc-select" style="max-width: 200px" v-model="filterType">
              <option value="">Todos os tipos</option>
              <option value="DECISION">Decisão</option>
              <option value="MISTAKE">Erro</option>
              <option value="LEARNING">Aprendizado</option>
              <option value="FEEDBACK">Feedback</option>
              <option value="INSIGHT">Insight</option>
            </select>
            <div class="vc-input-group" style="max-width: 240px">
              <input class="vc-input" type="search" placeholder="Buscar no caderno..." v-model="search" />
            </div>
          </div>

          <PanelCard v-for="entry in visible" :key="entry.entryId" :title="entry.title" muted>
            <template #header-actions>
              <span class="vc-badge vc-badge--purple" style="margin-left: auto">{{ entry.typeLabel }}</span>
            </template>
            <p class="vc-faint" style="margin-top: 0">
              {{ formatDate(entry.entryDate) }}
              <template v-if="entry.author"> · {{ entry.author.name }}</template>
              <template v-if="entry.mine"> · seu</template>
            </p>
            <p style="white-space: pre-wrap">{{ entry.body || 'Sem corpo.' }}</p>
            <template v-if="entry.mine || auth.can('TENANT_MANAGE')" #footer>
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(entry)">
                Editar
              </button>
              <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(entry)">
                Excluir
              </button>
            </template>
          </PanelCard>

          <EmptyState v-if="!visible.length" title="Caderno vazio">
            {{ scope?.canWriteJournal
              ? 'Comece pela decisão que você está adiando.'
              : 'Você não tem permissão para ler o caderno desta equipe.' }}
          </EmptyState>
        </div>

        <PanelCard title="Revisão pessoal" icon="notebook">
          <p class="vc-faint" style="margin-top: 0">Perguntas permanentes, para quando não houver o que escrever.</p>
          <div class="vc-list">
            <div v-for="(question, index) in questions" :key="index" class="vc-list__item vc-list__item--plain">
              <div class="vc-list__text">
                <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
                <span>{{ question }}</span>
              </div>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>

    <ModalDialog v-if="editing" :title="form.entryId ? 'Editar registro' : 'Novo registro'" wide
                 @close="editing = false">
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="jtype">Tipo</label>
          <select id="jtype" class="vc-select" v-model="form.type">
            <option value="DECISION">Decisão</option>
            <option value="MISTAKE">Erro</option>
            <option value="LEARNING">Aprendizado</option>
            <option value="FEEDBACK">Feedback</option>
            <option value="INSIGHT">Insight</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="jdate">Data</label>
          <input id="jdate" class="vc-input" type="date" v-model="form.entryDate" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="jtitle">Título</label>
        <input id="jtitle" class="vc-input" type="text" v-model="form.title"
               placeholder="Rotação de funções no robô" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="jbody">Registro</label>
        <textarea id="jbody" class="vc-textarea" rows="8" v-model="form.body"
                  placeholder="O que aconteceu, o que aprendi e o que farei diferente?"></textarea>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="save">Salvar</button>
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
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { development } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { toDateInputValue } from '@/services/time.js';

const auth = authStore();
const toast = useToast();

const entries = ref([]);
const scope = ref(null);
const editing = ref(false);
const filterType = ref('');
const search = ref('');
const form = reactive(blank());

const questions = [
  'Que decisão estou adiando?',
  'Onde intervim cedo demais?',
  'Quem precisa de mais autonomia?',
  'Qual processo gerou burocracia sem valor?',
  'O que aprendi que precisa virar método?',
];

const visible = computed(() => {
  const term = search.value.trim().toLowerCase();
  return entries.value
    .filter((entry) => !filterType.value || entry.type === filterType.value)
    .filter((entry) => !term
      || [entry.title, entry.body].filter(Boolean).some((field) => field.toLowerCase().includes(term)));
});

onMounted(load);
watch(() => auth.activeTenantId, load);

function blank() {
  return { entryId: null, type: 'DECISION', entryDate: toDateInputValue(new Date()), title: '', body: '' };
}

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const [scopeAnswer, list] = await Promise.all([
      development.scope(auth.activeTenantId),
      development.journal(auth.activeTenantId),
    ]);
    scope.value = scopeAnswer.data;
    entries.value = list.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar o caderno'));
  }
}

function openCreate() {
  Object.assign(form, blank());
  editing.value = true;
}

function openEdit(entry) {
  Object.assign(form, {
    entryId: entry.entryId,
    type: entry.type,
    entryDate: entry.entryDate,
    title: entry.title,
    body: entry.body || '',
  });
  editing.value = true;
}

async function save() {
  const body = { type: form.type, entryDate: form.entryDate, title: form.title, body: form.body };
  try {
    if (form.entryId) {
      await development.updateJournalEntry(form.entryId, body);
    } else {
      await development.addJournalEntry(auth.activeTenantId, body);
    }
    editing.value = false;
    await load();
    toast.success('Registro salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o registro'));
  }
}

async function remove(entry) {
  if (!window.confirm(`Excluir o registro "${entry.title}"?`)) return;
  try {
    await development.removeJournalEntry(entry.entryId);
    await load();
    toast.info('Registro excluído.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir o registro'));
  }
}

function formatDate(value) {
  return value ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
}
</script>
