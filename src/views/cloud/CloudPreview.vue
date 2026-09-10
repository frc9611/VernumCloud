<template>
  <aside class="cloud-panel">
    <!-- --------------------------------------------------------- many items -->
    <template v-if="selectionCount > 1">
      <header class="cloud-panel__head">
        <AppIcon name="copy" :size="20" />
        <div class="cloud-panel__title">
          <strong>{{ selectionCount }} itens selecionados</strong>
          <span class="vc-faint">{{ batchSummary }}</span>
        </div>
      </header>
      <p class="vc-faint cloud-panel__hint">
        Segure Shift para pegar um intervalo e Ctrl (ou Cmd) para marcar item a item.
      </p>
    </template>

    <!-- ---------------------------------------------------------- one item -->
    <template v-else-if="entry">
      <header class="cloud-panel__head">
        <AppIcon :name="headIcon" :size="20" :style="headColor ? { color: headColor } : null" />
        <div class="cloud-panel__title">
          <strong>{{ entry.name }}</strong>
          <span v-if="entry.isFolder" class="vc-faint">
            {{ entry.item.divisionId ? 'Pasta da divisão' : 'Pasta' }}
          </span>
          <span v-else class="vc-faint">{{ kind.label }} · {{ size }}</span>
        </div>
      </header>

      <!-- A folder has nothing to draw, and an empty frame saying so is worse than no frame -->
      <div v-if="!entry.isFolder || locked" class="cloud-panel__preview">
        <p v-if="locked" class="cloud-panel__blank">
          <AppIcon name="lock" :size="30" />
          <span>Você não abre este item. Peça acesso para ver o que tem dentro.</span>
        </p>
        <p v-else-if="loading" class="cloud-panel__blank">
          <AppIcon name="refresh" :size="24" />
          <span>Carregando pré-visualização...</span>
        </p>
        <template v-else-if="mode === 'image' && url">
          <img class="cloud-panel__image" :src="url" :alt="entry.name" />
        </template>
        <template v-else-if="mode === 'pdf' && url">
          <!-- The PDF plugin takes the focus when it opens, and the keyboard of the screen with it -->
          <iframe class="cloud-panel__pdf" :src="url" :title="entry.name" @load="$emit('shown')"></iframe>
        </template>
        <div v-else-if="mode === 'markdown'" class="cloud-panel__markdown" v-html="markdown"></div>
        <pre v-else-if="mode === 'text'" class="cloud-panel__text">{{ text }}</pre>
        <p v-else class="cloud-panel__blank">
          <AppIcon :name="kind.icon" :size="30" />
          <span>{{ blankMessage }}</span>
          <button v-if="heavy" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="load(true)">
            Pré-visualizar assim mesmo
          </button>
        </p>
      </div>

      <dl class="cloud-panel__meta">
        <template v-if="entry.item.divisionName">
          <dt>Divisão</dt>
          <dd>
            <span class="vc-dot" :style="{ background: entry.item.divisionColor || 'var(--vc-purple)' }"></span>
            {{ entry.item.divisionName }}
          </dd>
        </template>
        <template v-if="!entry.isFolder">
          <dt>Tipo</dt>
          <dd>{{ kind.label }}<span class="vc-faint"> · {{ entry.item.contentType || 'desconhecido' }}</span></dd>
          <dt>Tamanho</dt>
          <dd>{{ size }}</dd>
        </template>
        <template v-if="entry.isFolder && entry.item.visibility">
          <dt>Alcance</dt>
          <dd>{{ visibilityLabel }}</dd>
        </template>
        <dt>Acesso</dt>
        <dd>{{ accessLabel }}</dd>
        <template v-if="entry.item.ownerName">
          <dt>Dono</dt>
          <dd>{{ entry.item.ownerName }}</dd>
        </template>
        <template v-if="entry.item.createdAt">
          <dt>Criado</dt>
          <dd>{{ formatDateTime(entry.item.createdAt) }}</dd>
        </template>
      </dl>
    </template>

    <p v-else class="vc-faint cloud-panel__hint">Selecione um item para ver os detalhes.</p>

    <div v-if="actions.length" class="cloud-panel__actions">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        :class="['vc-btn', 'vc-btn--small', action.danger ? 'vc-btn--danger' : 'vc-btn--outline']"
        @click="$emit('action', action.key)"
      >
        <AppIcon :name="action.icon" :size="14" />
        {{ action.label }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { cloud } from '@/services/api.js';
import { formatDateTime } from '@/services/time.js';
import {
  PREVIEW_BINARY_LIMIT,
  PREVIEW_TEXT_LIMIT,
  fileKind,
  formatSize,
  isImage,
  isMarkdown,
  isPdf,
  isTextLike,
} from './cloudFiles.js';

/*
 * The panel on the right: what is selected, drawn instead of described.
 *
 * The bytes come from the same download route the rest of the screen uses — there is no public URL
 * for a file, everything carries the token — so a picture and a PDF become an object URL and text
 * is read straight out of the blob. Reading the blob is what lets a .ino or a .step-less .txt show
 * up here at all: the /content route only answers for the content types the server calls text, and
 * the browser names almost nothing when it uploads.
 *
 * Anything heavier than the limits waits for a click. On a phone line in a competition venue,
 * clicking a file must not cost 8 MB by surprise.
 */
const props = defineProps({
  entry: { type: Object, default: null },
  actions: { type: Array, default: () => [] },
  selectionCount: { type: Number, default: 0 },
  selectionBytes: { type: Number, default: 0 },
});

defineEmits(['action', 'shown']);

const mode = ref('none');
const url = ref('');
const text = ref('');
const loading = ref(false);
const heavy = ref(false);

const kind = computed(() => fileKind(props.entry?.isFolder ? null : props.entry?.item));
const locked = computed(() => props.entry?.item?.access === 'NONE');
const size = computed(() => formatSize(props.entry?.item?.sizeBytes) || '—');
const headColor = computed(() => props.entry?.item?.divisionColor || '');
const markdown = computed(() => (mode.value === 'markdown' ? renderMarkdown(text.value) : ''));

const headIcon = computed(() => {
  if (locked.value) return 'lock';
  if (!props.entry) return 'file';
  if (props.entry.isFolder) return props.entry.item.divisionId ? 'divisions' : (props.entry.item.icon || 'folder');
  return kind.value.icon;
});

const batchSummary = computed(() => {
  const bytes = props.selectionBytes ? formatSize(props.selectionBytes) : '';
  return bytes ? `${bytes} no total` : 'pastas e arquivos';
});

const blankMessage = computed(() => {
  if (heavy.value) return 'Arquivo grande: a pré-visualização não abre sozinha.';
  return 'Sem pré-visualização para este tipo. Baixe para abrir no programa certo.';
});

const accessLabel = computed(() => ({
  NONE: 'Sem acesso',
  VIEW: 'Ver e baixar',
  EDIT: 'Ver, enviar e alterar',
  MANAGE: 'Gerenciar e compartilhar',
}[props.entry?.item?.access] || '—'));

const visibilityLabel = computed(() => ({
  INHERIT: 'Herda da pasta acima',
  TENANT: 'Toda a equipe',
  RESTRICTED: 'Somente quem foi compartilhado',
}[props.entry?.item?.visibility] || '—'));

watch(() => props.entry?.key, () => load(false));

/*
 * The bytes may land after the panel is gone — a click on another screen while a picture is coming.
 * Without this the object URL is made after the unmount and never revoked, and the whole blob (up
 * to the 8 MB of the limit) stays in memory for as long as the tab lives.
 */
let alive = true;

onBeforeUnmount(() => {
  alive = false;
  release();
});

function release() {
  if (url.value) {
    window.URL.revokeObjectURL(url.value);
    url.value = '';
  }
}

function reset() {
  release();
  text.value = '';
  mode.value = 'none';
  heavy.value = false;
}

async function load(force) {
  reset();
  const entry = props.entry;
  const file = entry?.item;
  if (!entry || entry.isFolder || !file || locked.value) return;

  const wanted = isImage(file) ? 'image' : isPdf(file) ? 'pdf' : isTextLike(file) ? 'text' : 'none';
  if (wanted === 'none') return;

  const limit = wanted === 'text' ? PREVIEW_TEXT_LIMIT : PREVIEW_BINARY_LIMIT;
  if (!force && (file.sizeBytes || 0) > limit) {
    heavy.value = true;
    return;
  }

  loading.value = true;
  const key = entry.key;
  try {
    const response = await cloud.download(file.fileId);
    //The selection may have moved on, or the panel be gone, while the bytes were coming
    if (!alive || props.entry?.key !== key) return;
    if (wanted === 'text') {
      text.value = await response.data.text();
      mode.value = isMarkdown(file) ? 'markdown' : 'text';
    } else {
      const type = response.headers['content-type'] || file.contentType || 'application/octet-stream';
      url.value = window.URL.createObjectURL(new Blob([response.data], { type }));
      mode.value = wanted;
    }
  } catch (error) {
    reset(); //The screen already has the file listed; a failed preview is not worth a toast
  } finally {
    loading.value = false;
  }
}

/* ------------------------------------------------------------- markdown */

/*
 * A markdown just big enough for a README next to the files it talks about: headings, lists, quotes,
 * fences, bold, italic, code and links. Everything is escaped BEFORE any rule runs, so the only tags
 * in the output are the ones written here — that is what makes v-html safe on a file anybody uploads.
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function inlineMarkdown(line) {
  return line
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdown(source) {
  const lines = escapeHtml(source).split('\n');
  const out = [];
  let list = false;
  let fence = false;

  const closeList = () => {
    if (list) {
      out.push('</ul>');
      list = false;
    }
  };

  lines.forEach((raw) => {
    const line = raw.replace(/\s+$/, '');
    if (line.startsWith('```')) {
      closeList();
      out.push(fence ? '</pre>' : '<pre class="cloud-panel__fence">');
      fence = !fence;
      return;
    }
    if (fence) {
      out.push(line);
      return;
    }
    if (!line.trim()) {
      closeList();
      return;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 2, 6);
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      if (!list) {
        out.push('<ul>');
        list = true;
      }
      out.push(`<li>${inlineMarkdown(line.replace(/^\s*([-*+]|\d+\.)\s+/, ''))}</li>`);
      return;
    }
    closeList();
    if (/^&gt;\s?/.test(line)) {
      out.push(`<blockquote>${inlineMarkdown(line.replace(/^&gt;\s?/, ''))}</blockquote>`);
      return;
    }
    if (/^(---|\*\*\*)$/.test(line)) {
      out.push('<hr />');
      return;
    }
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  closeList();
  if (fence) out.push('</pre>');
  return out.join('\n');
}
</script>

<style scoped>
.cloud-panel {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
  padding: 14px;
  min-width: 0;
}

.cloud-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--vc-purple);
}

.cloud-panel__title {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.cloud-panel__title strong {
  color: var(--vc-text);
  font-size: 0.95rem;
  word-break: break-word;
}

.cloud-panel__hint {
  margin: 0;
}

.cloud-panel__preview {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
  overflow: hidden;
  min-height: 140px;
  max-height: 320px;
  display: flex;
}

.cloud-panel__blank {
  margin: 0;
  padding: 22px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--vc-text-muted);
  font-size: 0.85rem;
  width: 100%;
}

.cloud-panel__image {
  width: 100%;
  object-fit: contain;
  background: var(--vc-surface);
}

.cloud-panel__pdf {
  width: 100%;
  height: 320px;
  border: 0;
  background: var(--vc-surface);
}

.cloud-panel__text,
.cloud-panel__markdown {
  margin: 0;
  padding: 10px 12px;
  width: 100%;
  overflow: auto;
  background: var(--vc-surface);
  font-size: 0.78rem;
  line-height: 1.5;
}

.cloud-panel__text {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.cloud-panel__markdown :deep(h3),
.cloud-panel__markdown :deep(h4),
.cloud-panel__markdown :deep(h5),
.cloud-panel__markdown :deep(h6) {
  margin: 10px 0 4px;
  font-size: 0.9rem;
}

.cloud-panel__markdown :deep(p) {
  margin: 0 0 6px;
}

.cloud-panel__markdown :deep(ul) {
  margin: 0 0 6px;
  padding-left: 18px;
}

.cloud-panel__markdown :deep(blockquote) {
  margin: 0 0 6px;
  padding-left: 8px;
  border-left: 2px solid var(--vc-purple-border);
  color: var(--vc-text-muted);
}

.cloud-panel__markdown :deep(code),
.cloud-panel__markdown :deep(pre) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  background: var(--vc-surface-muted);
  border-radius: 4px;
}

.cloud-panel__markdown :deep(pre) {
  padding: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
}

.cloud-panel__meta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 10px;
  margin: 0;
  font-size: 0.82rem;
}

.cloud-panel__meta dt {
  color: var(--vc-text-faint);
}

.cloud-panel__meta dd {
  margin: 0;
  color: var(--vc-text);
  word-break: break-word;
}

.cloud-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-top: 1px solid var(--vc-border);
  padding-top: 10px;
}
</style>
