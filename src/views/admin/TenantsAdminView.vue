<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Equipes da plataforma</h1>
        <button v-if="auth.canPlatform('TENANT_CREATE')" class="vc-btn" type="button" @click="openCreate">
          Nova equipe
        </button>
      </div>

      <AlertBanner variant="info" icon="i" title="Somente a equipe administradora."
                   aside="Permissões TENANT_*">
        Criar e alterar equipes só funciona para quem é membro da Administração Vernum.
      </AlertBanner>

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Equipe</th><th>Nome de sistema</th><th>Número</th><th>Membros</th>
              <th>Divisões</th><th>Situação</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in list" :key="tenant.tenantId">
              <td>
                <span class="vc-dot" :style="{ background: tenant.color || '#8864AE' }"></span>
                {{ tenant.visibleName }}
                <span v-if="tenant.systemTenant" class="vc-badge vc-badge--purple">sistema</span>
              </td>
              <td class="vc-mono">{{ tenant.slug }}</td>
              <td>{{ tenant.teamNumber || '—' }}</td>
              <td>{{ tenant.memberCount ?? '—' }}</td>
              <td>{{ tenant.divisionCount ?? '—' }}</td>
              <td>
                <span class="vc-badge" :class="tenant.active ? 'vc-badge--on' : 'vc-badge--off'">
                  {{ tenant.active ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(tenant)">
                  Editar
                </button>
                <button v-if="auth.canPlatform('TENANT_DELETE') && !tenant.systemTenant"
                        class="vc-btn vc-btn--danger vc-btn--small" style="margin-left: 6px"
                        type="button" @click="remove(tenant)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!list.length" title="Nenhuma equipe">Crie a primeira equipe da plataforma.</EmptyState>
      </div>
    </div>

    <ModalDialog v-if="editing" :title="form.tenantId ? 'Editar equipe' : 'Nova equipe'" @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="visibleName">Nome visível</label>
        <input id="visibleName" class="vc-input" type="text" v-model="form.visibleName" placeholder="CyberRain" />
      </div>
      <div class="vc-field" v-if="!form.tenantId">
        <label class="vc-label" for="slug">Nome de sistema</label>
        <input id="slug" class="vc-input" type="text" v-model="form.slug" placeholder="cyberrain-9611" />
        <span class="vc-faint">Deixe em branco para gerar a partir do nome visível.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="teamNumber">Número da equipe</label>
        <input id="teamNumber" class="vc-input" type="text" v-model="form.teamNumber" placeholder="9611" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="color">Cor</label>
        <input id="color" class="vc-input" type="color" v-model="form.color" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="description">Descrição</label>
        <textarea id="description" class="vc-textarea" v-model="form.description"></textarea>
      </div>
      <div class="vc-field" v-if="!form.tenantId">
        <label class="vc-label" for="owner">Proprietário (username)</label>
        <input id="owner" class="vc-input" type="text" v-model="form.ownerUsername" />
        <span class="vc-faint">Em branco: você mesmo fica como proprietário.</span>
      </div>
      <label v-if="form.tenantId" class="vc-checkbox">
        <input type="checkbox" v-model="form.active" />
        Equipe ativa
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" @click="save">Salvar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/* Platform level screen: the tenants themselves. */
const auth = authStore();
const toast = useToast();
const list = ref([]);
const editing = ref(false);
const form = reactive({
  tenantId: null, slug: '', visibleName: '', teamNumber: '', color: '#8864AE',
  description: '', ownerUsername: '', active: true,
});

onMounted(load);

async function load() {
  try {
    const { data } = await tenants.list();
    list.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar equipes'));
  }
}

function openCreate() {
  Object.assign(form, {
    tenantId: null, slug: '', visibleName: '', teamNumber: '', color: '#8864AE',
    description: '', ownerUsername: '', active: true,
  });
  editing.value = true;
}

function openEdit(tenant) {
  Object.assign(form, {
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    visibleName: tenant.visibleName,
    teamNumber: tenant.teamNumber || '',
    color: tenant.color || '#8864AE',
    description: tenant.description || '',
    ownerUsername: '',
    active: tenant.active !== false,
  });
  editing.value = true;
}

async function save() {
  try {
    if (form.tenantId) {
      await tenants.update(form.tenantId, {
        visibleName: form.visibleName,
        teamNumber: form.teamNumber,
        color: form.color,
        description: form.description,
        active: form.active,
      });
    } else {
      await tenants.create({
        slug: form.slug,
        visibleName: form.visibleName,
        teamNumber: form.teamNumber,
        color: form.color,
        description: form.description,
        ownerUsername: form.ownerUsername || null,
      });
    }
    editing.value = false;
    await load();
    await auth.loadMe();
    toast.success('Equipe salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar equipe'));
  }
}

async function remove(tenant) {
  if (!window.confirm('Remover a equipe ' + tenant.visibleName + '?')) return;
  try {
    await tenants.remove(tenant.tenantId);
    await load();
    await auth.loadMe();
    toast.info('Equipe removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover equipe'));
  }
}
</script>
