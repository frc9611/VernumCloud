<template>
  <main class="vc-page vc-page--wide">
    <SectionTitle lead="Chaves" title="de API">
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'adminApps' }">Apps</router-link>
        <button class="vc-btn" type="button" @click="openForm">
          <AppIcon name="plus" :size="15" />
          Criar chave
        </button>
      </template>
    </SectionTitle>

    <AlertBanner variant="info" icon="key" title="Uma chave age como você, e nunca além de você">
      A chave vale só nesta equipe e só faz o que estiver marcado nela. Se você perder uma permissão,
      as suas chaves perdem também. Ela vai no cabeçalho <code>X-API-Key</code>.
    </AlertBanner>

    <div class="vc-table-wrap" v-if="keys.length">
      <table class="vc-table">
        <thead>
          <tr><th>Nome</th><th>Prefixo</th><th>Pode</th><th>Criada</th><th>Último uso</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="key in keys" :key="key.apiKeyId">
            <td>
              <strong>{{ key.visibleName }}</strong>
              <span v-if="key.appName" class="vc-chip">{{ key.appName }}</span>
              <span v-if="key.revoked" class="vc-chip vc-chip--warning">revogada</span>
              <span v-else-if="!key.usable" class="vc-chip vc-chip--warning">expirada</span>
              <span class="vc-faint" style="display: block">de {{ key.ownerName }}</span>
            </td>
            <td><code class="keys__code">vk_{{ key.prefix }}_…</code></td>
            <td>
              <span v-for="label in key.scopeLabels" :key="label" class="vc-chip">{{ label }}</span>
            </td>
            <td class="vc-faint">{{ formatWhen(key.createdAt) }}</td>
            <td class="vc-faint">{{ key.lastUsedAt ? formatWhen(key.lastUsedAt) : 'nunca' }}</td>
            <td style="text-align: right">
              <button v-if="!key.revoked" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="revoke(key)">
                Revogar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else title="Nenhuma chave criada">
      Crie uma chave quando um programa precisar falar com a API sem abrir o dashboard.
    </EmptyState>

    <!-- ---------------------------------------------------------------- form -->
    <ModalDialog v-if="form" wide title="Criar chave de API" @close="form = null">
      <div class="vc-field">
        <label class="vc-label" for="keyName">Nome</label>
        <input id="keyName" class="vc-input" type="text" v-model="form.visibleName"
               placeholder="Painel da sala, script de backup..." />
        <span class="vc-faint">Para você reconhecer depois onde ela é usada.</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="keyApp">App (opcional)</label>
        <select id="keyApp" class="vc-select" v-model="form.appId">
          <option :value="null">Nenhum</option>
          <option v-for="app in apps" :key="app.appId" :value="app.appId">{{ app.visibleName }}</option>
        </select>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="keyExpires">Expira em (opcional)</label>
        <input id="keyExpires" class="vc-input" type="date" v-model="form.expiresOn" />
      </div>
      <div class="vc-field">
        <label class="vc-label">O que a chave pode fazer</label>
        <div class="keys__scopes">
          <label v-for="permission in grantablePermissions" :key="permission.name" class="vc-checkbox">
            <input type="checkbox" :value="permission.name" v-model="form.scopes" />
            <span>{{ permission.label }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="form = null">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy || !form.scopes.length" @click="save">Criar</button>
      </template>
    </ModalDialog>

    <!-- ----------------------------------------------------------- new secret -->
    <ModalDialog v-if="created" title="Chave criada" @close="created = null">
      <AlertBanner variant="warning" icon="key" title="Copie agora">
        Esta é a única vez que a chave inteira existe fora daqui. O servidor guarda só um hash dela.
      </AlertBanner>
      <div class="vc-field">
        <label class="vc-label" for="createdKey">Chave</label>
        <div class="vc-input-group">
          <input id="createdKey" class="vc-input" readonly :value="created.key" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(created.key)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="createdExample">Exemplo de uso</label>
        <textarea id="createdExample" class="vc-textarea keys__example" readonly rows="3"
                  :value="example(created.key)"></textarea>
      </div>
      <template #footer>
        <button class="vc-btn" type="button" @click="created = null">Fechar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { apps as appsApi, catalogs } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * API keys of the team.
 *
 * The scopes offered are the tenant permissions the person actually has: the server
 * refuses a scope the creator does not hold, so showing more than that would only
 * produce an error toast.
 */
const auth = authStore();
const toast = useToast();

const keys = ref([]);
const apps = ref([]);
const permissions = ref([]);
const form = ref(null);
const created = ref(null);
const busy = ref(false);

const grantablePermissions = computed(() =>
  permissions.value
    .filter((permission) => permission.scope === 'TENANT' && auth.can(permission.name))
    .sort((first, second) => first.label.localeCompare(second.label)),
);

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await appsApi.apiKeys(auth.activeTenantId);
    keys.value = data;
  } catch (error) {
    keys.value = [];
    toast.error(apiMessage(error, 'Erro ao carregar as chaves'));
  }
  try {
    const { data } = await appsApi.list(auth.activeTenantId);
    apps.value = data;
  } catch (error) {
    apps.value = [];
  }
  try {
    const { data } = await catalogs.permissions();
    permissions.value = data;
  } catch (error) {
    permissions.value = [];
  }
}

function openForm() {
  form.value = { visibleName: '', appId: null, expiresOn: '', scopes: [] };
}

async function save() {
  busy.value = true;
  try {
    const { data } = await appsApi.createApiKey(auth.activeTenantId, {
      visibleName: form.value.visibleName,
      appId: form.value.appId,
      scopes: form.value.scopes,
      //The server takes a date and time; the field only asks for the day
      expiresAt: form.value.expiresOn ? form.value.expiresOn + 'T23:59:59' : null,
    });
    created.value = data;
    form.value = null;
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao criar a chave'));
  } finally {
    busy.value = false;
  }
}

async function revoke(key) {
  if (!window.confirm('Revogar a chave ' + key.visibleName + '? Ela para de funcionar na hora.')) return;
  try {
    await appsApi.revokeApiKey(key.apiKeyId);
    await load();
    toast.info('Chave revogada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao revogar a chave'));
  }
}

function example(key) {
  return 'curl -H "X-API-Key: ' + key + '" \\\n  '
    + (process.env.VUE_APP_API_URL || 'http://localhost:8080')
    + '/tenants/' + auth.activeTenantId + '/attendance/now';
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copiado!');
  } catch (error) {
    toast.warning('Copie manualmente.');
  }
}
</script>

<style scoped>
/* Chips that sit right after a name in the table need to breathe. */
.vc-table .vc-chip {
  margin-left: 6px;
}

.keys__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  background: var(--vc-surface-muted);
  border-radius: 4px;
  padding: 1px 5px;
}

.keys__scopes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 4px;
}

.keys__example {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  min-height: 70px;
}
</style>
