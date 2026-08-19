<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Processos seletivos</h1>
        <button v-if="auth.can('RECRUITMENT_MANAGE')" class="vc-btn" type="button" @click="openCreate">
          Novo processo
        </button>
      </div>

      <AlertBanner variant="info" icon="link" title="Link público de inscrição."
                   aside="Funciona sem conta">
        Cada processo tem um link próprio. Qualquer pessoa pode se candidatar por ele, e quem já tem conta
        pode entrar para preencher o formulário automaticamente.
      </AlertBanner>

      <EmptyState v-if="!processes.length" title="Nenhum processo seletivo">
        Crie um processo, defina as etapas e publique o link de inscrição.
      </EmptyState>

      <div v-else class="vc-stack">
        <article v-for="process in processes" :key="process.recruitmentProcessId" class="vc-card">
          <header class="vc-card__header">
            <span>{{ process.name }}</span>
            <span class="vc-card__icon">{{ process.statusLabel }}</span>
          </header>
          <div class="vc-card__body">
            <p v-if="process.description">{{ process.description }}</p>

            <div class="vc-row">
              <span class="vc-chip vc-chip--purple">{{ process.entryCount }} inscritos</span>
              <span class="vc-chip">{{ process.submittedCount }} novos</span>
              <span class="vc-chip vc-chip--info">{{ process.inReviewCount }} em avaliação</span>
              <span class="vc-chip vc-chip--success">{{ process.approvedCount }} aprovados</span>
              <span class="vc-chip vc-chip--danger">{{ process.rejectedCount }} reprovados</span>
            </div>

            <div class="vc-row">
              <span
                v-for="stage in process.stages"
                :key="stage.recruitmentStageId"
                class="vc-chip"
                :title="stage.description || ''"
              >
                {{ stage.position }}. {{ stage.name }} ({{ stage.candidateCount ?? 0 }})
              </span>
            </div>

            <div class="vc-field">
              <label class="vc-label">Link de inscrição</label>
              <div class="vc-input-group">
                <input class="vc-input" readonly :value="publicLink(process)" />
                <button class="vc-btn vc-btn--icon vc-btn--ghost" type="button" title="Copiar link"
                        @click="copy(publicLink(process))">
                  <AppIcon name="copy" :size="16" />
                </button>
                <a class="vc-btn vc-btn--ghost" :href="publicLink(process)" target="_blank" rel="noopener">Abrir</a>
              </div>
            </div>
          </div>
          <footer class="vc-card__footer">
            <router-link class="vc-btn" :to="{ name: 'recruitmentPanel', params: { id: process.recruitmentProcessId } }">
              Ver candidatos
            </router-link>
            <button v-if="auth.can('RECRUITMENT_MANAGE')" class="vc-btn vc-btn--ghost" type="button" @click="openEdit(process)">
              Editar
            </button>
            <button v-if="auth.can('RECRUITMENT_MANAGE')" class="vc-btn vc-btn--ghost" type="button" @click="openStages(process)">
              Etapas
            </button>
            <button v-if="auth.can('RECRUITMENT_MANAGE')" class="vc-btn vc-btn--ghost" type="button" @click="renewLink(process)">
              Gerar novo link
            </button>
            <span class="vc-spacer"></span>
            <button v-if="auth.can('RECRUITMENT_MANAGE')" class="vc-btn vc-btn--danger" type="button" @click="remove(process)">
              Remover
            </button>
          </footer>
        </article>
      </div>
    </div>

    <!-- --------------------------------------------------------- process -->
    <ModalDialog v-if="editing" :title="form.recruitmentProcessId ? 'Editar processo' : 'Novo processo'"
                 @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="name">Nome</label>
        <input id="name" class="vc-input" type="text" v-model="form.name" placeholder="Processo Seletivo 2026" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="description">Descrição</label>
        <textarea id="description" class="vc-textarea" v-model="form.description"></textarea>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="formIntro">Texto no topo do formulário</label>
        <textarea id="formIntro" class="vc-textarea" v-model="form.formIntro"
                  placeholder="Regras, prazos e o que o candidato precisa saber."></textarea>
      </div>
      <div class="vc-row" style="gap: 14px; align-items: flex-start">
        <div class="vc-field" style="flex: 1">
          <label class="vc-label" for="startDate">Início</label>
          <input id="startDate" class="vc-input" type="date" v-model="form.startDate" />
        </div>
        <div class="vc-field" style="flex: 1">
          <label class="vc-label" for="endDate">Fim</label>
          <input id="endDate" class="vc-input" type="date" v-model="form.endDate" />
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="status">Situação</label>
        <select id="status" class="vc-select" v-model="form.status">
          <option value="DRAFT">Rascunho (link não funciona)</option>
          <option value="OPEN">Inscrições abertas</option>
          <option value="CLOSED">Inscrições encerradas</option>
          <option value="ARCHIVED">Arquivado</option>
        </select>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.requiresDivision" />
        Exigir que o candidato escolha pelo menos uma divisão
      </label>
      <p class="vc-faint" style="margin: 0">
        As divisões oferecidas no formulário são as que estão marcadas como "aparece no processo seletivo"
        no painel de divisões.
      </p>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="save">Salvar</button>
      </template>
    </ModalDialog>

    <!-- ---------------------------------------------------------- stages -->
    <ModalDialog v-if="stagesOf" :title="'Etapas de ' + stagesOf.name" @close="stagesOf = null">
      <div class="vc-table-wrap" v-if="stages.length">
        <table class="vc-table">
          <thead><tr><th>#</th><th>Etapa</th><th>Candidatos</th><th>Final</th><th></th></tr></thead>
          <tbody>
            <tr v-for="stage in stages" :key="stage.recruitmentStageId">
              <td>{{ stage.position }}</td>
              <td>{{ stage.name }}</td>
              <td>{{ stage.candidateCount ?? 0 }}</td>
              <td>
                <span class="vc-badge" :class="stage.finalStage ? 'vc-badge--on' : 'vc-badge--neutral'">
                  {{ stage.finalStage ? 'Sim' : 'Não' }}
                </span>
              </td>
              <td style="text-align: right">
                <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removeStage(stage)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr class="vc-divider" />
      <div class="vc-field">
        <label class="vc-label" for="stageName">Nova etapa</label>
        <input id="stageName" class="vc-input" type="text" v-model="newStage.name" placeholder="Entrevista" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="stageDescription">Descrição</label>
        <input id="stageDescription" class="vc-input" type="text" v-model="newStage.description" />
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="newStage.finalStage" />
        É a etapa final do processo
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="stagesOf = null">Fechar</button>
        <button class="vc-btn" type="button" :disabled="!newStage.name" @click="addStage">Adicionar etapa</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { recruitment } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/* The selection processes of the team, with the public link and the etapas of each one. */
const auth = authStore();
const toast = useToast();

const processes = ref([]);
const editing = ref(false);
const form = reactive({
  recruitmentProcessId: null, name: '', description: '', formIntro: '',
  status: 'DRAFT', startDate: '', endDate: '', requiresDivision: true,
});

const stagesOf = ref(null);
const stages = ref([]);
const newStage = reactive({ name: '', description: '', finalStage: false });

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await recruitment.processes(auth.activeTenantId);
    processes.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar processos'));
  }
}

/** Full URL of the public form, ready to be shared outside the dashboard. */
function publicLink(process) {
  return window.location.origin + process.publicPath;
}

function openCreate() {
  Object.assign(form, {
    recruitmentProcessId: null, name: '', description: '', formIntro: '',
    status: 'DRAFT', startDate: '', endDate: '', requiresDivision: true,
  });
  editing.value = true;
}

function openEdit(process) {
  Object.assign(form, {
    recruitmentProcessId: process.recruitmentProcessId,
    name: process.name,
    description: process.description || '',
    formIntro: process.formIntro || '',
    status: process.status,
    startDate: process.startDate || '',
    endDate: process.endDate || '',
    requiresDivision: process.requiresDivision !== false,
  });
  editing.value = true;
}

async function save() {
  const body = {
    name: form.name,
    description: form.description,
    formIntro: form.formIntro,
    status: form.status,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    requiresDivision: form.requiresDivision,
  };
  try {
    if (form.recruitmentProcessId) {
      await recruitment.updateProcess(form.recruitmentProcessId, body);
    } else {
      await recruitment.createProcess(auth.activeTenantId, body);
    }
    editing.value = false;
    await load();
    toast.success('Processo salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar processo'));
  }
}

async function remove(process) {
  if (!window.confirm('Remover o processo ' + process.name + ' e todas as candidaturas?')) return;
  try {
    await recruitment.removeProcess(process.recruitmentProcessId);
    await load();
    toast.info('Processo removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover processo'));
  }
}

async function renewLink(process) {
  if (!window.confirm('Gerar um link novo? O link atual para de funcionar.')) return;
  try {
    await recruitment.renewLink(process.recruitmentProcessId);
    await load();
    toast.success('Novo link gerado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar link'));
  }
}

async function openStages(process) {
  stagesOf.value = process;
  Object.assign(newStage, { name: '', description: '', finalStage: false });
  await loadStages();
}

async function loadStages() {
  try {
    const { data } = await recruitment.stages(stagesOf.value.recruitmentProcessId);
    stages.value = data;
  } catch (error) {
    stages.value = [];
  }
}

async function addStage() {
  try {
    await recruitment.addStage(stagesOf.value.recruitmentProcessId, { ...newStage });
    Object.assign(newStage, { name: '', description: '', finalStage: false });
    await loadStages();
    await load();
    toast.success('Etapa adicionada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar etapa'));
  }
}

async function removeStage(stage) {
  try {
    await recruitment.removeStage(stage.recruitmentStageId);
    await loadStages();
    await load();
    toast.info('Etapa removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover etapa'));
  }
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Link copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}
</script>
