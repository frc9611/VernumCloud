<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Auditoria</h1>
        <span :class="['vc-chip', platformScope ? 'vc-chip--danger' : 'vc-chip--purple']">
          <AppIcon :name="platformScope ? 'shield' : 'flag'" :size="14" />
          {{ platformScope ? 'Plataforma inteira' : auth.activeTenantName }}
        </span>
      </div>

      <p class="vc-muted" style="margin: 0">
        Tudo que foi escrito na plataforma fica registrado aqui, sozinho, e nada nesta tela altera uma
        linha: a trilha só cresce.
        <template v-if="canSeePlatform">
          <router-link v-if="!platformScope" :to="{ name: 'adminAudit', query: { escopo: 'plataforma' } }">
            Ver a trilha de todas as equipes
          </router-link>
          <router-link v-else :to="{ name: 'adminAudit' }">
            Ver só a trilha desta equipe
          </router-link>
        </template>
      </p>

      <!-- ------------------------------------------------------------- números -->
      <div v-if="stats" class="vc-metrics">
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Linhas</span><AppIcon name="history" :size="16" /></div>
          <div class="vc-metric__value">{{ stats.tenantEntries.toLocaleString('pt-BR') }}</div>
          <div class="vc-metric__foot">
            <template v-if="!platformScope">de {{ stats.totalEntries.toLocaleString('pt-BR') }} na plataforma</template>
            <template v-else>nada expira: a trilha não se apaga sozinha</template>
          </div>
        </div>
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Espaço</span><AppIcon name="cloud" :size="16" /></div>
          <div class="vc-metric__value">{{ stats.estimatedSize }}</div>
          <div class="vc-metric__foot">estimativa do que a trilha ocupa</div>
        </div>
        <div class="vc-metric">
          <div class="vc-metric__head"><span>Desde</span><AppIcon name="clock" :size="16" /></div>
          <div class="vc-metric__value vc-metric__value--small">{{ formatDate(stats.oldestAt) }}</div>
          <div class="vc-metric__foot">última em {{ formatDateTime(stats.newestAt) }}</div>
        </div>
        <button type="button" :class="['vc-metric', 'audit__check', chainClass]" :disabled="verifying"
                @click="runVerify">
          <div class="vc-metric__head">
            <span>Corrente</span>
            <AppIcon :name="chain === null ? 'shield' : chain.intact ? 'check' : 'alert'" :size="16" />
          </div>
          <div class="vc-metric__value vc-metric__value--small">
            {{ verifying ? 'Conferindo...' : chain === null ? 'Conferir' : chain.intact ? 'Íntegra' : 'Quebrada' }}
          </div>
          <div class="vc-metric__foot">
            {{ chain ? chain.message : 'cada linha carrega o hash da anterior; clique para percorrer' }}
          </div>
        </button>
      </div>

      <!-- ------------------------------------------------------------- filtros -->
      <section class="audit__filters vc-stack">
        <div class="audit__grid">
          <div class="vc-field">
            <label class="vc-label" for="f-search">Busca</label>
            <input id="f-search" class="vc-input" type="search" v-model="form.search"
                   placeholder="nome de quem agiu, objeto ou rota" @keyup.enter="apply" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="f-action">Ação</label>
            <select id="f-action" class="vc-input" v-model="form.action">
              <option value="">Todas</option>
              <option v-for="a in actions" :key="a.name" :value="a.name">{{ a.label }}</option>
            </select>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="f-from">De</label>
            <input id="f-from" class="vc-input" type="date" v-model="form.from" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="f-to">Até</label>
            <input id="f-to" class="vc-input" type="date" v-model="form.to" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="f-ip">IP</label>
            <input id="f-ip" class="vc-input" type="text" v-model="form.ip" placeholder="exato" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="f-type">Tipo de objeto</label>
            <input id="f-type" class="vc-input" type="text" v-model="form.objectType" placeholder="ex.: cloud/file" />
          </div>
        </div>

        <div class="vc-row" style="flex-wrap: wrap; gap: 8px">
          <button class="vc-btn vc-btn--small" type="button" @click="apply">Filtrar</button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="!anyFilter" @click="clearAll">
            Limpar
          </button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="!total" @click="download">
            <AppIcon name="download" :size="14" /> Baixar CSV
          </button>
          <span class="vc-faint" style="margin-left: auto">
            {{ total.toLocaleString('pt-BR') }} {{ total === 1 ? 'linha' : 'linhas' }}
          </span>
        </div>

        <!-- Os filtros que não têm campo próprio: entram por um botão de investigação de uma linha. -->
        <div v-if="pinned.length" class="vc-row" style="flex-wrap: wrap; gap: 6px">
          <span v-for="pin in pinned" :key="pin.key" class="vc-chip vc-chip--purple">
            {{ pin.label }}
            <button class="audit__unpin" type="button" title="Tirar este filtro" @click="unpin(pin.key)">×</button>
          </span>
        </div>
      </section>

      <!-- ------------------------------------------------------------- linhas -->
      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!rows.length" title="Nenhuma linha com esses filtros">
        <template v-if="anyFilter">Tire um filtro e tente de novo.</template>
        <template v-else>Assim que alguém escrever alguma coisa nesta equipe, aparece aqui.</template>
      </EmptyState>

      <div v-else class="vc-table-wrap">
        <table class="vc-table audit__table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>O quê</th>
              <th>Sobre</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.auditId" class="audit__row" @click="open(row)">
              <td class="audit__when">
                <span>{{ formatDateTime(row.occurredAt) }}</span>
                <span class="vc-faint">{{ formatAgo(row.occurredAt) }}</span>
              </td>
              <td>
                <template v-if="row.actorName">
                  <strong>{{ row.actorName }}</strong>
                  <span v-if="row.actorRoleLabel" class="vc-faint"> · {{ row.actorRoleLabel }}</span>
                </template>
                <span v-else class="vc-faint">sem login</span>
                <div v-if="platformScope && row.tenantLabel" class="vc-faint">{{ row.tenantLabel }}</div>
              </td>
              <td>
                <span class="vc-chip">{{ row.actionLabel }}</span>
                <div v-if="row.httpPath" class="vc-faint audit__path">{{ row.httpMethod }} {{ row.httpPath }}</div>
              </td>
              <td>
                <template v-if="row.objectLabel">
                  <span>{{ row.objectLabel }}</span>
                  <div v-if="row.objectType" class="vc-faint">{{ row.objectType }}</div>
                </template>
                <span v-else-if="row.objectType" class="vc-faint">{{ row.objectType }}</span>
                <span v-else class="vc-faint">—</span>
              </td>
              <td>
                <span :class="['vc-chip', statusClass(row)]">{{ row.statusCode ?? '—' }}</span>
                <div v-if="row.failure" class="vc-faint">{{ row.failure }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="vc-row" style="gap: 8px; align-items: center">
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="page === 0"
                @click="goTo(page - 1)">Anterior</button>
        <span class="vc-faint">Página {{ page + 1 }} de {{ totalPages }}</span>
        <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="page + 1 >= totalPages"
                @click="goTo(page + 1)">Próxima</button>
      </div>
    </div>

    <!-- ------------------------------------------------------------- uma linha -->
    <ModalDialog v-if="detail" wide :title="'Linha ' + detail.auditId" @close="detail = null">
      <div class="vc-stack audit__detail">
        <div class="audit__facts">
          <div><span class="vc-label">Quando</span><span>{{ formatDateTime(detail.occurredAt) }}</span></div>
          <div><span class="vc-label">Ação</span><span>{{ detail.actionLabel }}</span></div>
          <div>
            <span class="vc-label">Quem</span>
            <span>
              <template v-if="detail.actorName">
                {{ detail.actorName }}
                <span v-if="detail.actorUsername" class="vc-faint">@{{ detail.actorUsername }}</span>
              </template>
              <template v-else>sem login</template>
            </span>
          </div>
          <div>
            <span class="vc-label">Cargo na hora</span>
            <span>{{ detail.actorRoleLabel || '—' }}</span>
          </div>
          <div><span class="vc-label">Equipe</span><span>{{ detail.tenantLabel || '—' }}</span></div>
          <div><span class="vc-label">Objeto</span><span>{{ detail.objectLabel || detail.objectId || '—' }}</span></div>
          <div><span class="vc-label">Resultado</span>
            <span>{{ detail.statusCode ?? '—' }}<template v-if="detail.failure"> · {{ detail.failure }}</template></span>
          </div>
          <div><span class="vc-label">Credencial</span><span>{{ detail.credentialLabel || '—' }}</span></div>
          <div><span class="vc-label">IP</span><span>{{ detail.ipAddress || '—' }}</span></div>
          <div class="audit__facts--wide">
            <span class="vc-label">Rota</span>
            <span class="audit__mono">{{ detail.httpMethod }} {{ detail.httpPath }}{{ detail.httpQuery ? '?' + detail.httpQuery : '' }}</span>
          </div>
          <div class="audit__facts--wide"><span class="vc-label">Navegador</span>
            <span class="vc-faint">{{ detail.userAgent || '—' }}</span></div>
        </div>

        <!--
          O antes e o depois só existem nas linhas que um service nomeou, porque só ele sabia o que
          estava mudando. Numa linha do interceptador o que há é o corpo da requisição.
        -->
        <section v-if="diff.length" class="vc-stack">
          <SectionTitle title="O que mudou" />
          <table class="vc-table audit__diff">
            <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
            <tbody>
              <tr v-for="line in diff" :key="line.field" :class="line.changed ? 'is-changed' : ''">
                <td class="audit__mono">{{ line.field }}</td>
                <td class="audit__mono">{{ line.before }}</td>
                <td class="audit__mono">{{ line.after }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section v-if="detail.payload" class="vc-stack">
          <SectionTitle title="Corpo enviado" />
          <pre class="audit__pre">{{ pretty(detail.payload) }}</pre>
          <p class="vc-faint" style="margin: 0">
            Campo que parece segredo — senha, token, chave — é gravado como
            <code>[REDIGIDO]</code>, aqui e na query.
          </p>
        </section>

        <section class="vc-stack">
          <SectionTitle title="A corrente" />
          <p class="vc-faint audit__mono" style="margin: 0; word-break: break-all">
            anterior {{ detail.previousHash || '(primeira linha)' }}<br />
            esta&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{ detail.contentHash }}
          </p>
        </section>
      </div>

      <template #footer>
        <button v-if="detail.actorId" class="vc-btn vc-btn--ghost" type="button"
                @click="investigate('actor', detail.actorId, detail.actorName)">
          Tudo desta pessoa
        </button>
        <button v-if="detail.objectType && detail.objectId" class="vc-btn vc-btn--ghost" type="button"
                @click="investigate('object', detail.objectType + '/' + detail.objectId, detail.objectLabel)">
          Tudo deste objeto
        </button>
        <button v-if="detail.requestId" class="vc-btn vc-btn--ghost" type="button"
                @click="investigate('request', detail.requestId, 'mesma requisição')">
          Mesma requisição
        </button>
        <button class="vc-btn" type="button" @click="detail = null">Fechar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { audit } from '@/services/api.js';
import { formatAgo, formatDate, formatDateTime } from '@/services/time.js';

/*
 * A trilha de auditoria como uma investigação a lê.
 *
 * A tela tem um escopo só de cada vez, e ele vem da query (`?escopo=plataforma`) em vez de um estado
 * interno: assim um link para "tudo desta pessoa na plataforma" é um link, e o botão de voltar do
 * navegador desfaz um passo da investigação em vez de sair da tela.
 *
 * Os três botões do rodapé de uma linha são o que separa uma listagem de uma ferramenta: partindo de
 * uma linha, "quem mais mexeu nisso", "o que mais essa pessoa fez" e "o que mais aconteceu no mesmo
 * clique" — este último é o `requestId`, que é como a linha automática do interceptador e a linha que
 * um service nomeou se provam o mesmo ato.
 */
const auth = authStore();
const route = useRoute();
const toast = useToast();

const SIZE = 50;

const rows = ref([]);
const actions = ref([]);
const stats = ref(null);
const chain = ref(null);
const detail = ref(null);
const loading = ref(true);
const verifying = ref(false);
const page = ref(0);
const total = ref(0);
const totalPages = ref(0);

const form = reactive({ search: '', action: '', from: '', to: '', ip: '', objectType: '' });
/* Filtros sem campo próprio, que só um botão de investigação liga: pessoa, objeto e requisição. */
const locked = reactive({ userId: '', userLabel: '', objectId: '', objectLabel: '', requestId: '' });

const canSeePlatform = computed(() => auth.platformAdmin || auth.canPlatform('AUDIT_VIEW'));
const platformScope = computed(() => route.query.escopo === 'plataforma' && canSeePlatform.value);
const scopeTenant = computed(() => (platformScope.value ? null : auth.activeTenantId));

const anyFilter = computed(() =>
  Object.values(form).some((v) => v) || !!locked.userId || !!locked.objectId || !!locked.requestId);

const pinned = computed(() => {
  const list = [];
  if (locked.userId) list.push({ key: 'userId', label: `Pessoa: ${locked.userLabel || locked.userId}` });
  if (locked.objectId) list.push({ key: 'objectId', label: `Objeto: ${locked.objectLabel || locked.objectId}` });
  if (locked.requestId) list.push({ key: 'requestId', label: `Requisição: ${locked.requestId.slice(0, 8)}` });
  return list;
});

const chainClass = computed(() => {
  if (!chain.value) return '';
  return chain.value.intact ? 'audit__check--ok' : 'audit__check--broken';
});

function params(extra = {}) {
  const body = { page: page.value, size: SIZE };
  if (form.search) body.search = form.search;
  if (form.action) body.action = form.action;
  if (form.from) body.from = form.from;
  if (form.to) body.to = form.to;
  if (form.ip) body.ip = form.ip;
  if (form.objectType) body.objectType = form.objectType;
  if (locked.userId) body.userId = locked.userId;
  if (locked.requestId) body.requestId = locked.requestId;
  if (locked.objectId) {
    const [type, ...rest] = locked.objectId.split('/');
    body.objectType = type;
    body.objectId = rest.join('/');
  }
  return { ...body, ...extra };
}

async function load() {
  loading.value = true;
  try {
    const { data } = await audit.list(scopeTenant.value, params());
    rows.value = data.items;
    total.value = data.totalElements;
    totalPages.value = data.totalPages;
  } catch (error) {
    rows.value = [];
    total.value = 0;
    toast.error(error.response?.data?.message || 'Não deu para ler a trilha.');
  } finally {
    loading.value = false;
  }
}

async function loadSide() {
  /* O catálogo e os números não impedem a tela de funcionar, então uma falha aqui é silenciosa. */
  try {
    const [a, s] = await Promise.all([audit.actions(scopeTenant.value), audit.stats(scopeTenant.value)]);
    actions.value = a.data;
    stats.value = s.data;
  } catch (error) {
    actions.value = [];
    stats.value = null;
  }
}

async function runVerify() {
  verifying.value = true;
  try {
    const { data } = await audit.verify(scopeTenant.value);
    chain.value = data;
    if (data.intact) toast.success('A corrente está íntegra.');
    else toast.error(data.message);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para conferir a corrente.');
  } finally {
    verifying.value = false;
  }
}

function apply() {
  page.value = 0;
  load();
}

function clearAll() {
  Object.keys(form).forEach((k) => { form[k] = ''; });
  Object.keys(locked).forEach((k) => { locked[k] = ''; });
  apply();
}

function unpin(key) {
  locked[key] = '';
  if (key === 'userId') locked.userLabel = '';
  if (key === 'objectId') locked.objectLabel = '';
  apply();
}

function goTo(next) {
  page.value = next;
  load();
}

async function open(row) {
  try {
    const { data } = await audit.one(scopeTenant.value, row.auditId);
    detail.value = data;
  } catch (error) {
    /* A linha da listagem já tem quase tudo: mostrar ela é melhor do que não abrir nada. */
    detail.value = row;
  }
}

function investigate(kind, value, label) {
  if (kind === 'actor') { locked.userId = value; locked.userLabel = label; }
  if (kind === 'object') { locked.objectId = value; locked.objectLabel = label; }
  if (kind === 'request') { locked.requestId = value; }
  detail.value = null;
  apply();
}

async function download() {
  try {
    const { data } = await audit.exportCsv(scopeTenant.value, params({ page: undefined, size: undefined }));
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = platformScope.value ? 'auditoria-plataforma.csv' : `auditoria-equipe-${scopeTenant.value}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error('Não deu para exportar a trilha.');
  }
}

/*
 * A cor do resultado é metade do valor da listagem: quem investiga varre a coluna atrás do que não
 * deu 200. Um 4xx é recusa — alguém tentou o que não podia, e é isso que se procura — e um 5xx é
 * defeito do servidor.
 *
 * `failure` fica de fora da conta de propósito: uma recusa comum também deixa exceção registrada, e
 * pintar 403 de vermelho e 400 de amarelo separaria duas recusas por um detalhe interno em vez de
 * pela única distinção que importa aqui.
 */
function statusClass(row) {
  const code = row.statusCode;
  if (!code) return 'vc-chip--warning';
  if (code >= 500) return 'vc-chip--danger';
  if (code >= 400) return 'vc-chip--warning';
  return 'vc-chip--success';
}

function parse(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (error) {
    return null;
  }
}

function pretty(raw) {
  const value = parse(raw);
  return value ? JSON.stringify(value, null, 2) : raw;
}

/* O antes e o depois lado a lado, campo a campo, com os que mudaram marcados. */
const diff = computed(() => {
  const before = parse(detail.value?.stateBefore);
  const after = parse(detail.value?.stateAfter);
  if (!before && !after) return [];
  const fields = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].sort();
  return fields.map((field) => {
    const a = show(before?.[field]);
    const b = show(after?.[field]);
    return { field, before: a, after: b, changed: a !== b };
  });
});

function show(value) {
  if (value === undefined) return '—';
  if (value === null) return 'nulo';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

onMounted(reload);
watch(() => [route.query.escopo, auth.activeTenantId], reload);

function reload() {
  page.value = 0;
  chain.value = null;
  loadSide();
  load();
}
</script>

<style scoped>
.audit__filters {
  padding: 12px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
}

.audit__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.audit__check {
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.audit__check--ok {
  border-color: var(--vc-success-border);
}

.audit__check--broken {
  border-color: var(--vc-danger-border);
}

.vc-metric__value--small {
  font-size: 18px;
}

.audit__row {
  cursor: pointer;
}

.audit__row:hover {
  background: var(--vc-surface-muted);
}

.audit__when {
  white-space: nowrap;
}

.audit__when span {
  display: block;
}

.audit__path,
.audit__mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  word-break: break-all;
}

.audit__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.audit__facts > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audit__facts--wide {
  grid-column: 1 / -1;
}

.audit__diff tr.is-changed td {
  background: var(--vc-warning-bg);
}

.audit__pre {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: var(--vc-surface-muted);
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.audit__unpin {
  margin-left: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  line-height: 1;
}
</style>
