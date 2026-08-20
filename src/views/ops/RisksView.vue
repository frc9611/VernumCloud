<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Mapa de riscos</h1>
        <button v-if="auth.can('RISK_MANAGE')" class="vc-btn" type="button" @click="openCreate">
          Novo risco
        </button>
      </div>

      <AlertBanner v-if="critical.length" variant="danger" title="Riscos críticos exigem decisão."
                   :aside="critical.length + ' crítico(s)'">
        Probabilidade alta com impacto alto é crítico por definição — o sistema marca sozinho, para a
        lista não depender do humor do dia.
      </AlertBanner>

      <div class="vc-row" style="flex-wrap: wrap">
        <select class="vc-select" style="max-width: 200px" v-model="filters.status" @change="load">
          <option value="">Todas as situações</option>
          <option value="CRITICAL">Críticos</option>
          <option value="OPEN">Abertos</option>
          <option value="CLOSED">Fechados</option>
        </select>
        <span class="vc-spacer"></span>
        <span class="vc-chip">{{ risks.length }} risco(s)</span>
      </div>

      <div class="vc-grid">
        <PanelCard v-for="risk in risks" :key="risk.riskId" :title="risk.title" muted>
          <template #header-actions>
            <span :class="['vc-badge', badge(risk.status)]" style="margin-left: auto">
              {{ risk.statusLabel }}
            </span>
          </template>
          <p>{{ risk.mitigation }}</p>
          <div class="vc-row" style="flex-wrap: wrap">
            <span class="vc-chip">probabilidade {{ risk.probabilityLabel.toLowerCase() }}</span>
            <span class="vc-chip">impacto {{ risk.impactLabel.toLowerCase() }}</span>
            <span v-if="risk.divisionName" class="vc-chip vc-chip--purple">{{ risk.divisionName }}</span>
          </div>
          <p class="vc-faint">
            Responsável: {{ risk.ownerUser?.name || risk.ownerLabel || 'a definir' }}
          </p>
          <template v-if="auth.can('RISK_MANAGE')" #footer>
            <button v-if="risk.status !== 'CLOSED'" class="vc-btn vc-btn--outline vc-btn--small"
                    type="button" @click="close(risk)">
              Marcar mitigado
            </button>
            <button v-else class="vc-btn vc-btn--outline vc-btn--small" type="button" @click="reopen(risk)">
              Reabrir
            </button>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(risk)">
              Editar
            </button>
            <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(risk)">
              Excluir
            </button>
          </template>
        </PanelCard>
      </div>

      <EmptyState v-if="!risks.length" title="Nenhum risco registrado">
        {{ auth.can('RISK_MANAGE')
          ? 'Escrever um risco antes dele acontecer é o que transforma um susto em um plano.'
          : 'Quem conduz a equipe registra os riscos aqui.' }}
      </EmptyState>
    </div>

    <ModalDialog v-if="editing" :title="form.riskId ? 'Editar risco' : 'Novo risco'" wide
                 @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="rtitle">Risco</label>
        <input id="rtitle" class="vc-input" type="text" v-model="form.title"
               placeholder="Programação concentrada em poucos estudantes" />
      </div>
      <div class="vc-grid">
        <div class="vc-field">
          <label class="vc-label" for="prob">Probabilidade</label>
          <select id="prob" class="vc-select" v-model="form.probability">
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="impact">Impacto</label>
          <select id="impact" class="vc-select" v-model="form.impact">
            <option value="LOW">Baixo</option>
            <option value="MEDIUM">Médio</option>
            <option value="HIGH">Alto</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="rowner">Responsável (texto livre)</label>
          <input id="rowner" class="vc-input" type="text" v-model="form.ownerLabel" placeholder="Mentoria" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="rdivision">Divisão</label>
          <select id="rdivision" class="vc-select" v-model="form.divisionId">
            <option value="">Nenhuma</option>
            <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
              {{ division.visibleName }}
            </option>
          </select>
        </div>
      </div>
      <p v-if="form.probability === 'HIGH' && form.impact === 'HIGH' && !form.riskId"
         class="vc-faint">
        Alta com alto: este risco vai nascer marcado como crítico.
      </p>
      <div class="vc-field">
        <label class="vc-label" for="mitigation">Mitigação</label>
        <textarea id="mitigation" class="vc-textarea" v-model="form.mitigation"
                  placeholder="Como reduzir ou responder ao risco?"></textarea>
        <span class="vc-faint">Obrigatória: um risco sem mitigação é um desabafo.</span>
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
import { divisions as divisionsApi, risks as risksApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

const auth = authStore();
const toast = useToast();

const risks = ref([]);
const divisionList = ref([]);
const editing = ref(false);
const filters = reactive({ status: '' });
const form = reactive(blank());

const critical = computed(() => risks.value.filter((risk) => risk.status === 'CRITICAL'));

onMounted(load);
watch(() => auth.activeTenantId, load);

function blank() {
  return {
    riskId: null, title: '', probability: 'MEDIUM', impact: 'MEDIUM',
    ownerLabel: '', divisionId: '', mitigation: '',
  };
}

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await risksApi.list(auth.activeTenantId,
      filters.status ? { status: filters.status } : {});
    risks.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar os riscos'));
  }
  if (auth.can('DIVISION_VIEW')) {
    try {
      const { data } = await divisionsApi.list(auth.activeTenantId);
      divisionList.value = data;
    } catch (error) {
      divisionList.value = [];
    }
  }
}

function badge(status) {
  if (status === 'CRITICAL') return 'vc-badge--off';
  if (status === 'CLOSED') return 'vc-badge--on';
  return 'vc-badge--neutral';
}

function openCreate() {
  Object.assign(form, blank());
  editing.value = true;
}

function openEdit(risk) {
  Object.assign(form, {
    riskId: risk.riskId,
    title: risk.title,
    probability: risk.probability,
    impact: risk.impact,
    ownerLabel: risk.ownerLabel || '',
    divisionId: risk.divisionId || '',
    mitigation: risk.mitigation || '',
  });
  editing.value = true;
}

async function save() {
  const body = {
    title: form.title,
    probability: form.probability,
    impact: form.impact,
    ownerLabel: form.ownerLabel || null,
    divisionId: form.divisionId || null,
    mitigation: form.mitigation,
  };
  try {
    if (form.riskId) {
      await risksApi.update(form.riskId, body);
    } else {
      await risksApi.create(auth.activeTenantId, body);
    }
    editing.value = false;
    await load();
    toast.success('Risco salvo!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o risco'));
  }
}

async function close(risk) {
  try {
    await risksApi.update(risk.riskId, { status: 'CLOSED' });
    await load();
    toast.success('Risco marcado como mitigado.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao fechar o risco'));
  }
}

/* Reopening asks the server to decide the situation again from the probability and the impact. */
async function reopen(risk) {
  try {
    await risksApi.update(risk.riskId, {
      status: risk.probability === 'HIGH' && risk.impact === 'HIGH' ? 'CRITICAL' : 'OPEN',
    });
    await load();
    toast.info('Risco reaberto.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao reabrir o risco'));
  }
}

async function remove(risk) {
  if (!window.confirm(`Excluir o risco "${risk.title}"?`)) return;
  try {
    await risksApi.remove(risk.riskId);
    await load();
    toast.info('Risco excluído.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir o risco'));
  }
}
</script>
