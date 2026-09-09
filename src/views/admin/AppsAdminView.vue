<template>
  <main class="vc-page vc-page--wide">
    <SectionTitle lead="Apps" title="da Equipe">
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'admin' }">Painel admin</router-link>
        <router-link v-if="auth.can('API_KEY_MANAGE')" class="vc-btn vc-btn--ghost vc-btn--small"
                     :to="{ name: 'adminApiKeys' }">
          Chaves de API
        </router-link>
        <button class="vc-btn" type="button" @click="openForm(null)">
          <AppIcon name="plus" :size="15" />
          Cadastrar app
        </button>
      </template>
    </SectionTitle>

    <p class="vc-faint">
      Um app cadastrado aqui aparece na aba Apps da equipe. Ligando o login pelo Vernum, ele passa a
      receber um token da pessoa depois que ela autoriza na tela de consentimento — sem nunca ver a senha.
    </p>

    <!-- ------------------------------------------------------- installed apps -->
    <div class="vc-table-wrap" v-if="installed.length">
      <table class="vc-table">
        <thead>
          <tr>
            <th>App</th><th>Endereço</th><th>Login pelo Vernum</th><th>Origem</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in installed" :key="app.appId">
            <td>
              <span class="apps__dot" :style="{ background: app.color || 'var(--vc-purple)' }"></span>
              <strong>{{ app.visibleName }}</strong>
              <span class="vc-faint apps__slug">{{ app.slug }}</span>
              <span v-if="!app.active" class="vc-chip vc-chip--warning">desativado</span>
            </td>
            <td>
              <a v-if="app.url" :href="app.url" target="_blank" rel="noopener">{{ app.url }}</a>
              <span v-else class="vc-faint">—</span>
            </td>
            <td>
              <template v-if="app.ssoEnabled">
                <code class="apps__code">{{ app.clientId }}</code>
                <span class="vc-chip">{{ app.confidential ? 'com segredo' : 'PKCE' }}</span>
              </template>
              <span v-else class="vc-faint">não</span>
            </td>
            <td>
              <span v-if="app.ownedByThisTenant" class="vc-chip vc-chip--purple">desta equipe</span>
              <span v-else class="vc-chip">{{ app.ownerTenantName }}</span>
              <span v-if="app.shared" class="vc-chip">compartilhado</span>
            </td>
            <td style="text-align: right">
              <button v-if="app.ssoEnabled" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                      @click="examplesFor = app">
                Ver exemplos
              </button>
              <button v-if="app.ownedByThisTenant" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                      @click="openForm(app)">
                Editar
              </button>
              <button v-if="app.ownedByThisTenant && app.ssoEnabled && app.confidential"
                      class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="rotate(app)">
                Novo segredo
              </button>
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="uninstall(app)">
                Tirar da aba
              </button>
              <button v-if="app.ownedByThisTenant" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="remove(app)">
                Remover
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EmptyState v-else title="Nenhum app na aba ainda">
      Cadastre o Discord, o quiosque de presença ou qualquer ferramenta que a equipe usa.
    </EmptyState>

    <!-- ------------------------------------------------------- available apps -->
    <template v-if="available.length">
      <SectionTitle lead="Apps" title="de outras equipes" />
      <p class="vc-faint">
        Apps que outras equipes marcaram como compartilhados. Instalar coloca o card na sua aba e
        libera o login pelo Vernum para os seus membros.
      </p>
      <div class="vc-grid">
        <PanelCard v-for="app in available" :key="app.appId" :title="app.visibleName"
                   :icon="app.icon || 'link'" :color="app.color">
          <p>{{ app.description || 'Sem descrição.' }}</p>
          <p class="vc-faint" style="margin: 0">de {{ app.ownerTenantName }}</p>
          <template #footer>
            <button class="vc-btn" type="button" @click="install(app)">Instalar</button>
          </template>
        </PanelCard>
      </div>
    </template>

    <!-- ---------------------------------------------------------------- form -->
    <ModalDialog v-if="form" wide :title="form.appId ? 'Editar ' + form.visibleName : 'Cadastrar app'"
                 @close="form = null">
      <div class="vc-field">
        <label class="vc-label" for="appName">Nome</label>
        <input id="appName" class="vc-input" type="text" v-model="form.visibleName" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="appDescription">Descrição</label>
        <textarea id="appDescription" class="vc-textarea" v-model="form.description"></textarea>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="appUrl">Endereço</label>
        <input id="appUrl" class="vc-input" type="url" v-model="form.url" placeholder="https://..." />
      </div>
      <div class="vc-row">
        <div class="vc-field" style="flex: 1">
          <label class="vc-label" for="appColor">Cor do card</label>
          <input id="appColor" class="vc-input" type="color" v-model="form.color" />
        </div>
        <div class="vc-field" style="flex: 1">
          <label class="vc-label" for="appIcon">Ícone</label>
          <select id="appIcon" class="vc-select" v-model="form.icon">
            <option v-for="name in iconNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
      </div>

      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.shared" />
        <span>
          Outras equipes podem instalar
          <span class="vc-faint" style="display: block">
            Para um app que atende várias equipes, como o quiosque de presença.
          </span>
        </span>
      </label>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.active" />
        <span>Ativo</span>
      </label>

      <hr class="vc-divider" />

      <label class="vc-checkbox">
        <input type="checkbox" v-model="form.ssoEnabled" />
        <span>
          Login pelo Vernum (SSO)
          <span class="vc-faint" style="display: block">
            O app manda a pessoa para o Vernum e recebe um token dela de volta.
          </span>
        </span>
      </label>

      <template v-if="form.ssoEnabled">
        <div class="vc-field">
          <label class="vc-label" for="appRedirects">Endereços de retorno</label>
          <textarea id="appRedirects" class="vc-textarea" v-model="form.redirectUris"
                    placeholder="https://presenca.exemplo.com/callback"></textarea>
          <span class="vc-faint">Um por linha. O login só volta para um endereço desta lista.</span>
        </div>
        <label class="vc-checkbox">
          <input type="checkbox" v-model="form.confidential" />
          <span>
            O app tem servidor próprio e guarda um segredo
            <span class="vc-faint" style="display: block">
              Desmarque para um app que roda só no navegador: aí ele se identifica por PKCE.
            </span>
          </span>
        </label>
        <div class="vc-field">
          <label class="vc-label">O que o token do app pode fazer</label>
          <span class="vc-faint">
            Sem nenhuma marcada, o token age com todas as permissões da pessoa.
          </span>
          <div class="apps__scopes">
            <label v-for="permission in grantablePermissions" :key="permission.name" class="vc-checkbox">
              <input type="checkbox" :value="permission.name" v-model="form.scopes" />
              <span>{{ permission.label }}</span>
            </label>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="form = null">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="busy" @click="save">Salvar</button>
      </template>
    </ModalDialog>

    <!-- -------------------------------------------------------------- secret -->
    <ModalDialog v-if="secret" wide title="Credenciais do app" @close="secret = null">
      <AlertBanner variant="warning" icon="key" title="Copie agora">
        O segredo aparece uma única vez. O servidor guarda só um hash dele, do mesmo jeito que guarda
        uma senha.
      </AlertBanner>
      <div class="vc-field">
        <label class="vc-label" for="secretClientId">client_id</label>
        <div class="vc-input-group">
          <input id="secretClientId" class="vc-input" readonly :value="secret.clientId" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(secret.clientId)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <div v-if="secret.clientSecret" class="vc-field">
        <label class="vc-label" for="secretValue">client_secret</label>
        <div class="vc-input-group">
          <input id="secretValue" class="vc-input" readonly :value="secret.clientSecret" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(secret.clientSecret)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <p v-else class="vc-faint" style="margin: 0">
        Esse app não guarda segredo: ele se identifica por PKCE.
      </p>
      <div class="vc-field">
        <label class="vc-label" for="secretConsent">Endereço para mandar a pessoa</label>
        <div class="vc-input-group">
          <input id="secretConsent" class="vc-input" readonly :value="consentUrl(secret.app, secret.clientId)" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar"
                  @click="copy(consentUrl(secret.app, secret.clientId))">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
        <span class="vc-faint">{{ consentHint(secret.app) }}</span>
      </div>
      <div class="vc-field">
        <span class="vc-label">Exemplos de código</span>
        <CodeExamples :examples="examplesOf(secret.app, secret.clientId, secret.clientSecret)"
                      remember="ssoExampleLanguage" @copy="copy" />
        <span class="vc-faint">
          O código que volta no endereço de retorno vale uma vez, por 5 minutos, e só com o mesmo
          <code class="apps__code">redirectUri</code>. A troca em
          <code class="apps__code">/public/sso/token</code> vai sem cabeçalho Authorization.
        </span>
      </div>
      <template #footer>
        <button class="vc-btn" type="button" @click="secret = null">Fechar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------ examples -->
    <ModalDialog v-if="examplesFor" wide :title="'Exemplos: ' + examplesFor.visibleName" @close="examplesFor = null">
      <p class="vc-faint" style="margin: 0">
        <template v-if="examplesFor.confidential">
          Este app tem servidor próprio e troca o código com o <code class="apps__code">client_secret</code>,
          que só aparece ao cadastrar ou em "Novo segredo" — aqui ele fica como
          <code class="apps__code">{{ secretPlaceholder }}</code>.
        </template>
        <template v-else>
          Este app roda só no navegador e se identifica por PKCE: não há segredo para guardar.
        </template>
      </p>
      <div class="vc-field">
        <label class="vc-label" for="examplesClientId">client_id</label>
        <div class="vc-input-group">
          <input id="examplesClientId" class="vc-input" readonly :value="examplesFor.clientId" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar" @click="copy(examplesFor.clientId)">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="examplesConsent">Endereço para mandar a pessoa</label>
        <div class="vc-input-group">
          <input id="examplesConsent" class="vc-input" readonly
                 :value="consentUrl(examplesFor, examplesFor.clientId)" />
          <button class="vc-btn vc-btn--icon" type="button" title="Copiar"
                  @click="copy(consentUrl(examplesFor, examplesFor.clientId))">
            <AppIcon name="copy" :size="16" />
          </button>
        </div>
        <span class="vc-faint">{{ consentHint(examplesFor) }}</span>
      </div>
      <CodeExamples :examples="examplesOf(examplesFor, examplesFor.clientId, null)"
                    remember="ssoExampleLanguage" @copy="copy" />
      <span class="vc-faint">
        O código que volta no endereço de retorno vale uma vez, por 5 minutos, e só com o mesmo
        <code class="apps__code">redirectUri</code>. A troca em
        <code class="apps__code">/public/sso/token</code> vai sem cabeçalho Authorization.
      </span>
      <template #footer>
        <button class="vc-btn" type="button" @click="examplesFor = null">Fechar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import PanelCard from '@/components/PanelCard.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import CodeExamples from '@/components/CodeExamples.vue';
import { authStore } from '@/store/auth.js';
import { apps as appsApi, catalogs } from '@/services/api.js';
import http, { apiMessage } from '@/services/http.js';
import { SECRET_PLACEHOLDER, consentUrl as buildConsentUrl, ssoExamples } from '@/services/integrationExamples.js';

/*
 * Registering the apps of a team.
 *
 * The apps of the tab come from installs, so a shared app of another team shows up here
 * too — installable, but not editable: only the team that registered it changes it.
 * The client secret is answered once, when the app is created or the secret is rotated,
 * which is why the modal that shows it says so out loud.
 */
const auth = authStore();
const toast = useToast();

const installed = ref([]);
const available = ref([]);
const permissions = ref([]);
const form = ref(null);
const secret = ref(null);
/** The app whose integration examples are open — clientId only, never a secret. */
const examplesFor = ref(null);
const busy = ref(false);

const secretPlaceholder = SECRET_PLACEHOLDER;

/* Icons that make sense on an app card. AppIcon has the drawings. */
const iconNames = ['link', 'comment', 'clock', 'cloud', 'chart', 'clipboard', 'users', 'shield', 'key', 'flag'];

/* A scope is a tenant permission, and nobody hands out one they do not have. */
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
    const { data } = await appsApi.list(auth.activeTenantId);
    installed.value = data;
  } catch (error) {
    installed.value = [];
    toast.error(apiMessage(error, 'Erro ao carregar os apps'));
  }
  try {
    const { data } = await appsApi.available(auth.activeTenantId);
    available.value = data;
  } catch (error) {
    available.value = [];
  }
  try {
    const { data } = await catalogs.permissions();
    permissions.value = data;
  } catch (error) {
    permissions.value = [];
  }
}

function openForm(app) {
  form.value = app
    ? {
      appId: app.appId,
      visibleName: app.visibleName,
      description: app.description || '',
      url: app.url || '',
      color: app.color || auth.activeTenantColor,
      icon: app.icon || 'link',
      shared: !!app.shared,
      active: app.active !== false,
      ssoEnabled: !!app.ssoEnabled,
      confidential: !!app.confidential,
      redirectUris: (app.redirectUris || []).join('\n'),
      scopes: [...(app.scopes || [])],
    }
    : {
      appId: null,
      visibleName: '',
      description: '',
      url: '',
      color: auth.activeTenantColor,
      icon: 'link',
      shared: false,
      active: true,
      ssoEnabled: false,
      confidential: true,
      redirectUris: '',
      scopes: [],
    };
}

function body() {
  const current = form.value;
  return {
    visibleName: current.visibleName,
    description: current.description,
    url: current.url,
    color: current.color,
    icon: current.icon,
    shared: current.shared,
    active: current.active,
    ssoEnabled: current.ssoEnabled,
    confidential: current.confidential,
    redirectUris: current.redirectUris
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length),
    scopes: current.scopes,
  };
}

async function save() {
  busy.value = true;
  try {
    if (form.value.appId) {
      await appsApi.update(form.value.appId, body());
      toast.success('App atualizado!');
    } else {
      const { data } = await appsApi.create(auth.activeTenantId, body());
      if (data.clientId) secret.value = data;
      toast.success('App cadastrado!');
    }
    form.value = null;
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o app'));
  } finally {
    busy.value = false;
  }
}

async function rotate(app) {
  if (!window.confirm('Gerar um segredo novo para ' + app.visibleName + '? O atual para de funcionar.')) return;
  try {
    const { data } = await appsApi.rotateSecret(app.appId);
    secret.value = data;
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar o segredo'));
  }
}

async function install(app) {
  try {
    await appsApi.install(auth.activeTenantId, app.appId);
    await load();
    toast.success(app.visibleName + ' instalado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao instalar o app'));
  }
}

async function uninstall(app) {
  if (!window.confirm('Tirar ' + app.visibleName + ' da aba de apps da equipe?')) return;
  try {
    await appsApi.uninstall(auth.activeTenantId, app.appId);
    await load();
    toast.info('App tirado da aba.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao tirar o app'));
  }
}

async function remove(app) {
  if (!window.confirm('Remover ' + app.visibleName + ' de vez? Some de todas as equipes que instalaram.')) return;
  try {
    await appsApi.remove(app.appId);
    await load();
    toast.info('App removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o app'));
  }
}

/*
 * Where the app has to send the person to start the login. A PKCE app has to bring a challenge or
 * the consent screen refuses it, so its URL carries the parameters the app must generate, in
 * upper case; the redirect is the first one registered, which is the one an app usually has.
 */
function consentUrl(app, clientId) {
  return buildConsentUrl({
    clientId,
    redirectUri: app?.redirectUris?.[0] || null,
    confidential: !!app?.confidential,
    dashboard: window.location.origin,
  });
}

function consentHint(app) {
  return app?.confidential
    ? 'Gere um state aleatório por login e confira na volta.'
    : 'Gere o state e o code_challenge (SHA-256 do verifier, em base64url) a cada login — o exemplo do navegador faz isso.';
}

/** The snippets of an app. The secret is only known right after create or rotate; null shows a placeholder. */
function examplesOf(app, clientId, clientSecret) {
  return ssoExamples({
    clientId,
    clientSecret,
    redirectUri: app?.redirectUris?.[0] || null,
    confidential: !!app?.confidential,
    dashboard: window.location.origin,
    api: http.defaults.baseURL,
  });
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}
</script>

<style scoped>
.apps__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.apps__slug {
  margin-left: 6px;
}

.apps__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  background: var(--vc-surface-muted);
  border-radius: 4px;
  padding: 1px 5px;
}

.apps__scopes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 4px;
  margin-top: 6px;
}
</style>
