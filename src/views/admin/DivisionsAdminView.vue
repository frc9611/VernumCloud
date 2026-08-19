<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Divisões de {{ auth.activeTenantName }}</h1>
        <button v-if="auth.can('DIVISION_CREATE')" class="vc-btn" type="button" @click="openCreate(null)">
          Nova divisão
        </button>
      </div>

      <p class="vc-muted" style="margin: 0">
        Uma divisão sem divisão acima é uma divisão principal da equipe. Qualquer divisão pode receber
        subdivisões, sem limite de profundidade.
      </p>

      <EmptyState v-if="!flat.length" title="Nenhuma divisão ainda">
        Crie a primeira divisão da equipe.
      </EmptyState>

      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr><th>Divisão</th><th>Nome de sistema</th><th>Membros</th><th>Processo seletivo</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in flat" :key="row.divisionId">
              <td>
                <span :style="{ paddingLeft: row.depth * 20 + 'px' }">
                  <span class="vc-dot" :style="{ background: row.color || '#8864AE' }"></span>
                  {{ row.visibleName }}
                </span>
              </td>
              <td class="vc-mono">{{ row.slug }}</td>
              <td>{{ row.memberCount ?? 0 }}</td>
              <td>
                <span class="vc-badge" :class="row.showInSelectionProcess ? 'vc-badge--on' : 'vc-badge--neutral'">
                  {{ row.showInSelectionProcess ? 'Aparece' : 'Oculta' }}
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap">
                <router-link class="vc-btn vc-btn--ghost vc-btn--small"
                             :to="{ name: 'divisionDetail', params: { id: row.divisionId } }">
                  Membros
                </router-link>
                <button v-if="auth.can('DIVISION_CREATE')" class="vc-btn vc-btn--ghost vc-btn--small"
                        style="margin-left: 6px" type="button" @click="openCreate(row)">
                  Subdivisão
                </button>
                <button v-if="auth.can('DIVISION_UPDATE')" class="vc-btn vc-btn--ghost vc-btn--small"
                        style="margin-left: 6px" type="button" @click="openEdit(row)">
                  Editar
                </button>
                <button v-if="auth.can('DIVISION_DELETE')" class="vc-btn vc-btn--danger vc-btn--small"
                        style="margin-left: 6px" type="button" @click="remove(row)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ModalDialog v-if="editing" :title="modalTitle" @close="editing = false">
      <p v-if="form.parentDivisionId" class="vc-faint" style="margin: 0">
        Subdivisão de <strong>{{ parentName }}</strong>.
      </p>
      <div class="vc-field">
        <label class="vc-label" for="visibleName">Nome visível</label>
        <input id="visibleName" class="vc-input" type="text" v-model="form.visibleName" placeholder="Engenharia" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="slug">Nome de sistema</label>
        <input id="slug" class="vc-input" type="text" v-model="form.slug" placeholder="engenharia" />
        <span class="vc-faint">Único dentro da equipe. Em branco: gerado a partir do nome visível.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="color">Cor</label>
        <input id="color" class="vc-input" type="color" v-model="form.color" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="description">Descrição</label>
        <textarea id="description" class="vc-textarea" v-model="form.description"></textarea>
      </div>
      <div class="vc-field" v-if="form.divisionId">
        <label class="vc-label" for="parent">Divisão acima</label>
        <select id="parent" class="vc-select" v-model="form.parentDivisionId">
          <option :value="0">Nenhuma (divisão principal)</option>
          <option v-for="option in parentOptions" :key="option.divisionId" :value="option.divisionId">
            {{ option.visibleName }}
          </option>
        </select>
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.showInSelectionProcess" />
        Oferecer esta divisão nos processos seletivos
      </label>
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
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { divisions } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/* Management of the division tree: create, move, rename and remove. */
const auth = authStore();
const toast = useToast();

const tree = ref([]);
const editing = ref(false);
const form = reactive({
  divisionId: null, slug: '', visibleName: '', color: '#8864AE',
  description: '', parentDivisionId: 0, showInSelectionProcess: false,
});

/** The tree turned into rows, keeping the depth so the table can indent them. */
const flat = computed(() => {
  const rows = [];
  const walk = (nodes, depth) => {
    nodes.forEach((node) => {
      rows.push({ ...node, depth });
      walk(node.children || [], depth + 1);
    });
  };
  walk(tree.value, 0);
  return rows;
});

/** Divisions that can be the parent: anything except the division itself and its own subtree. */
const parentOptions = computed(() => {
  if (!form.divisionId) return flat.value;
  const forbidden = new Set();
  const collect = (nodes) => {
    nodes.forEach((node) => {
      if (node.divisionId === form.divisionId) {
        const mark = (item) => {
          forbidden.add(item.divisionId);
          (item.children || []).forEach(mark);
        };
        mark(node);
      } else {
        collect(node.children || []);
      }
    });
  };
  collect(tree.value);
  return flat.value.filter((row) => !forbidden.has(row.divisionId));
});

const parentName = computed(() => {
  const parent = flat.value.find((row) => row.divisionId === form.parentDivisionId);
  return parent?.visibleName || '';
});

const modalTitle = computed(() => {
  if (form.divisionId) return 'Editar divisão';
  return form.parentDivisionId ? 'Nova subdivisão' : 'Nova divisão';
});

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await divisions.tree(auth.activeTenantId);
    tree.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar divisões'));
  }
}

function openCreate(parent) {
  Object.assign(form, {
    divisionId: null,
    slug: '',
    visibleName: '',
    color: parent?.color || auth.activeTenantColor,
    description: '',
    parentDivisionId: parent?.divisionId || 0,
    showInSelectionProcess: false,
  });
  editing.value = true;
}

function openEdit(division) {
  Object.assign(form, {
    divisionId: division.divisionId,
    slug: division.slug,
    visibleName: division.visibleName,
    color: division.color || '#8864AE',
    description: division.description || '',
    parentDivisionId: division.parentDivisionId || 0,
    showInSelectionProcess: !!division.showInSelectionProcess,
  });
  editing.value = true;
}

async function save() {
  const body = {
    slug: form.slug,
    visibleName: form.visibleName,
    color: form.color,
    description: form.description,
    showInSelectionProcess: form.showInSelectionProcess,
    parentDivisionId: form.parentDivisionId || null,
  };
  try {
    if (form.divisionId) {
      //Zero means "no parent": the server reads it as moving the division to the top
      body.parentDivisionId = form.parentDivisionId === 0 ? 0 : form.parentDivisionId;
      await divisions.update(form.divisionId, body);
    } else {
      await divisions.create(auth.activeTenantId, body);
    }
    editing.value = false;
    await load();
    await auth.loadMe();
    toast.success('Divisão salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar divisão'));
  }
}

async function remove(division) {
  if (!window.confirm('Remover a divisão ' + division.visibleName + '?')) return;
  try {
    await divisions.remove(division.divisionId);
    await load();
    await auth.loadMe();
    toast.info('Divisão removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover divisão'));
  }
}
</script>
