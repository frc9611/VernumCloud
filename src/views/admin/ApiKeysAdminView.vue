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
      Uma chave faz só o que estiver marcado nela, e vale nas equipes que você escolher — e só nas
      que você mesmo pode administrar. Se você perder uma permissão, as suas chaves perdem também.
      Ela vai no cabeçalho <code>X-API-Key</code>. Esta lista mostra também as chaves que
      <strong>outra equipe criou e que agem sobre esta</strong>.
    </AlertBanner>

    <div class="vc-table-wrap" v-if="keys.length">
      <table class="vc-table">
        <thead>
          <tr><th>Nome</th><th>Prefixo</th><th>Vale em</th><th>Pode</th><th>Criada</th><th>Último uso</th><th></th></tr>
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
              <span v-for="team in key.tenants" :key="team.tenantId"
                    class="vc-chip" :class="{ 'vc-chip--purple': team.owner }"
                    :title="team.owner ? 'Equipe que criou a chave' : 'Equipe alcançada pela chave'">
                {{ team.tenantName }}
              </span>
            </td>
            <td>
              <span v-for="label in key.scopeLabels" :key="label" class="vc-chip">{{ label }}</span>
            </td>
            <td class="vc-faint">{{ formatWhen(key.createdAt) }}</td>
            <td class="vc-faint">{{ key.lastUsedAt ? formatWhen(key.lastUsedAt) : 'nunca' }}</td>
            <td style="text-align: right">
              <template v-if="!key.revoked">
                <button v-if="key.tenantId === auth.activeTenantId"
                        class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="revoke(key)">
                  Revogar
                </button>
                <button v-else class="vc-btn vc-btn--danger vc-btn--small" type="button"
                        @click="removeFromTeam(key)">
                  Tirar desta equipe
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else title="Nenhuma chave criada">
      Crie uma chave quando um programa precisar falar com a API sem abrir o dashboard.
    </EmptyState>

    <!-- --------------------------------------------------------------- guide -->
    <section class="vc-stack keys__guide">
      <SectionTitle lead="Como usar" title="uma chave" />
      <p class="vc-faint keys__guide-lead">
        A chave vai no cabeçalho <code class="keys__code">X-API-Key</code> de qualquer rota da API, e
        não há equipe para configurar no programa: ela já diz em quais vale. Troque
        <code class="keys__code">{{ placeholderKey }}</code> pela chave que aparece ao criar.
      </p>
      <CodeExamples :examples="guideExamples" remember="apiKeyExampleLanguage" @copy="copy" />
      <p class="vc-faint keys__guide-lead">{{ answers }}</p>
    </section>

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
      <div class="vc-field" v-if="otherTenants.length">
        <label class="vc-label">Em quais equipes ela vale</label>
        <div class="keys__scopes">
          <label class="vc-checkbox">
            <input type="checkbox" checked disabled />
            <span>{{ auth.activeTenantName }} <span class="vc-faint">(esta, sempre)</span></span>
          </label>
          <label v-for="team in otherTenants" :key="team.tenantId" class="vc-checkbox">
            <input type="checkbox" :value="team.tenantId" v-model="form.tenantIds" />
            <span>{{ team.visibleName }}</span>
          </label>
        </div>
        <span class="vc-faint">
          Só aparecem as equipes onde você também pode criar chaves. O servidor confere cada
          permissão marcada em cada equipe escolhida, e recusa dizendo qual falta onde.
        </span>
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
    <ModalDialog v-if="created" wide title="Chave criada" @close="created = null">
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
        <span class="vc-label">Exemplo de uso</span>
        <CodeExamples :examples="createdExamples" remember="apiKeyExampleLanguage" @copy="copy" />
        <span class="vc-faint">{{ answers }}</span>
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
import CodeExamples from '@/components/CodeExamples.vue';
import { authStore } from '@/store/auth.js';
import { apps as appsApi, catalogs } from '@/services/api.js';
import http, { apiMessage } from '@/services/http.js';
import { API_KEY_ANSWERS, API_KEY_PLACEHOLDER, apiKeyExamples } from '@/services/integrationExamples.js';

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

/*
 * As outras equipes da pessoa onde ela tambem pode criar chave. O servidor confere de novo, uma a
 * uma — isto aqui e so para nao oferecer o que ele vai recusar.
 */
const otherTenants = computed(() =>
  auth.memberships
    .filter((membership) => membership.tenant?.tenantId !== auth.activeTenantId)
    .filter((membership) => (membership.permissions || []).includes('API_KEY_MANAGE'))
    .map((membership) => membership.tenant)
    .sort((first, second) => first.visibleName.localeCompare(second.visibleName)),
);

const grantablePermissions = computed(() =>
  permissions.value
    .filter((permission) => permission.scope === 'TENANT' && auth.can(permission.name))
    .sort((first, second) => first.label.localeCompare(second.label)),
);

/*
 * The samples talk to the same API this dashboard does, so a production build never prints
 * localhost. There is no team to write down anywhere: the key carries the teams it serves, which is
 * why the reader's call has no tenant in the path — what changes with the scopes is only whether
 * the sample is the reader's tap (RFID_AUTH) or a plain read of who is in the room.
 */
const placeholderKey = API_KEY_PLACEHOLDER;
const answers = API_KEY_ANSWERS;

const guideExamples = computed(() => apiKeyExamples({
  key: API_KEY_PLACEHOLDER,
  api: http.defaults.baseURL,
  tenantId: auth.activeTenantId,
  scopes: null,
}));

const createdExamples = computed(() => apiKeyExamples({
  key: created.value?.key,
  api: http.defaults.baseURL,
  tenantId: auth.activeTenantId,
  scopes: created.value?.apiKey?.scopes || [],
}));

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
  form.value = { visibleName: '', appId: null, expiresOn: '', scopes: [], tenantIds: [] };
}

async function save() {
  busy.value = true;
  try {
    const { data } = await appsApi.createApiKey(auth.activeTenantId, {
      visibleName: form.value.visibleName,
      appId: form.value.appId,
      scopes: form.value.scopes,
      tenantIds: form.value.tenantIds,
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

async function removeFromTeam(key) {
  const here = auth.activeTenantName;
  if (!window.confirm(
    `Tirar a chave "${key.visibleName}" de ${here}? Ela para de funcionar aqui e continua valendo `
    + `em ${key.tenantName}, que foi quem a criou.`)) {
    return;
  }
  try {
    await appsApi.removeApiKeyFromTenant(auth.activeTenantId, key.apiKeyId);
    await load();
    toast.info('Chave desligada nesta equipe.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao tirar a chave desta equipe'));
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

.keys__guide {
  margin-top: 12px;
}

.keys__guide-lead {
  margin: 0;
}
</style>
