<template>
  <main class="vc-page">
    <div class="wiki">
      <!-- ------------------------------------------------------------- índice -->
      <aside class="wiki__index vc-stack">
        <div class="vc-row vc-row--between">
          <h1 class="vc-title" style="font-size: 20px">Base</h1>
          <button v-if="canWrite" class="vc-btn vc-btn--small" type="button" @click="startNew()">
            <AppIcon name="plus" :size="14" /> Nova
          </button>
        </div>

        <input class="vc-input" type="search" v-model="needle" placeholder="Buscar página..." />

        <p v-if="loading" class="vc-faint">Carregando...</p>
        <EmptyState v-else-if="!pages.length" title="Base vazia">
          <template v-if="canWrite">Comece por um modelo: procedimento, decisão, lição aprendida.</template>
          <template v-else>Ninguém escreveu nada aqui ainda.</template>
        </EmptyState>

        <ul v-else class="wiki__tree">
          <li v-for="node in tree" :key="node.pageId">
            <button :class="['wiki__link', node.slug === slug ? 'is-open' : '']" type="button"
                    @click="open(node.slug)">
              <span class="wiki__name">{{ node.title }}</span>
              <span v-if="!node.published" class="vc-chip vc-chip--warning">rascunho</span>
            </button>
            <ul v-if="node.children.length" class="wiki__children">
              <li v-for="child in node.children" :key="child.pageId">
                <button :class="['wiki__link', child.slug === slug ? 'is-open' : '']" type="button"
                        @click="open(child.slug)">
                  <span class="wiki__name">{{ child.title }}</span>
                  <span v-if="!child.published" class="vc-chip vc-chip--warning">rascunho</span>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </aside>

      <!-- -------------------------------------------------------------- página -->
      <section class="wiki__page vc-stack">
        <EmptyState v-if="!slug" title="Escolha uma página">
          O que a equipe sabe, escrito para quem chega depois: procedimentos, decisões e lições
          aprendidas.
        </EmptyState>

        <template v-else-if="page">
          <div class="vc-row vc-row--between" style="align-items: flex-start">
            <div>
              <h2 class="vc-title" style="margin: 0">{{ page.title }}</h2>
              <p v-if="page.summary" class="vc-muted" style="margin: 4px 0 0">{{ page.summary }}</p>
              <p class="vc-faint" style="margin: 6px 0 0">
                <span v-if="!page.published" class="vc-chip vc-chip--warning">rascunho</span>
                Atualizada {{ formatAgo(page.updatedAt) }}
                <template v-if="page.updatedBy"> por {{ page.updatedBy.name }}</template>
              </p>
            </div>
            <div class="vc-row" style="gap: 6px; flex-wrap: wrap; justify-content: flex-end">
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="downloadPdf">
                <AppIcon name="download" :size="14" /> PDF
              </button>
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openHistory">
                <AppIcon name="history" :size="14" /> Versões
              </button>
              <button v-if="canWrite" class="vc-btn vc-btn--small" type="button" @click="startEdit">
                <AppIcon name="edit" :size="14" /> Editar
              </button>
              <button v-if="canDelete" class="vc-btn vc-btn--danger vc-btn--small" type="button"
                      @click="remove">
                Apagar
              </button>
            </div>
          </div>

          <MarkdownView :content="page.content" :tenant-id="auth.activeTenantId" />

          <section v-if="visibleAttachments.length" class="vc-stack wiki__files">
            <SectionTitle title="Anexos" />
            <ul class="wiki__attachments">
              <li v-for="item in visibleAttachments" :key="item.fileId">
                <AppIcon name="file" :size="14" />
                <button class="wiki__filename" type="button" @click="downloadAttachment(item)">
                  {{ item.name }}
                </button>
                <span class="vc-faint">{{ size(item.sizeBytes) }}</span>
                <button v-if="canWrite" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                        @click="detach(item)">tirar</button>
              </li>
            </ul>
          </section>
        </template>
      </section>
    </div>

    <!-- ------------------------------------------------------------- histórico -->
    <ModalDialog v-if="history" wide title="Versões desta página" @close="history = null">
      <p class="vc-muted" style="margin: 0 0 10px">
        Cada salvamento que mudou o texto virou uma versão. Voltar para uma delas não apaga nada: grava
        o texto antigo como uma versão nova.
      </p>
      <ul class="wiki__revisions">
        <li v-for="revision in history" :key="revision.revisionId">
          <div>
            <strong>v{{ revision.number }}</strong>
            <span class="vc-faint"> · {{ formatDateTime(revision.createdAt) }}</span>
            <span v-if="revision.author" class="vc-faint"> · {{ revision.author.name }}</span>
            <div v-if="revision.note" class="vc-faint">{{ revision.note }}</div>
          </div>
          <div class="vc-row" style="gap: 6px">
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="peek(revision)">
              Ver
            </button>
            <button v-if="canWrite && revision.number !== history[0].number"
                    class="vc-btn vc-btn--small" type="button" @click="restore(revision)">
              Voltar para esta
            </button>
          </div>
        </li>
      </ul>
    </ModalDialog>

    <ModalDialog v-if="peeked" wide :title="`v${peeked.number} — ${peeked.title}`" @close="peeked = null">
      <MarkdownView :content="peeked.content" :tenant-id="auth.activeTenantId" />
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import MarkdownView from '@/components/wiki/MarkdownView.vue';
import { authStore } from '@/store/auth.js';
import { cloud, wiki } from '@/services/api.js';
import { formatAgo, formatDateTime } from '@/services/time.js';

/*
 * A base de conhecimento: índice à esquerda, página à direita.
 *
 * A página aberta está na rota (`/base/:slug`) e não num estado da tela, porque uma página de wiki é
 * feita para ser mandada para alguém — "lê o procedimento da bateria" é um link, e o botão de voltar
 * tem que andar entre páginas em vez de sair da base.
 */
const auth = authStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const pages = ref([]);
const page = ref(null);
const attachments = ref([]);
const history = ref(null);
const peeked = ref(null);
const loading = ref(true);
const needle = ref('');

const slug = computed(() => route.params.slug || '');
const canWrite = computed(() => auth.can('WIKI_MANAGE'));
const canDelete = computed(() => auth.can('WIKI_DELETE'));

/* A imagem já desenhada dentro do texto não é um anexo a abrir: a lista é o que se abre à parte. */
const visibleAttachments = computed(() => attachments.value.filter((item) => !item.inline));

const filtered = computed(() => {
  const term = needle.value.trim().toLowerCase();
  if (!term) return pages.value;
  return pages.value.filter((p) =>
    p.title.toLowerCase().includes(term) || (p.summary || '').toLowerCase().includes(term));
});

/*
 * Dois níveis e não uma árvore recursiva: um índice de wiki com quatro níveis é um índice que ninguém
 * lê. Uma página mais funda aparece na raiz em vez de sumir.
 */
const tree = computed(() => {
  const visible = filtered.value;
  const ids = new Set(visible.map((p) => p.pageId));
  const roots = visible.filter((p) => !p.parentId || !ids.has(p.parentId));
  return roots.map((root) => ({
    ...root,
    children: visible.filter((p) => p.parentId === root.pageId),
  }));
});

onMounted(load);
watch(() => auth.activeTenantId, load);
watch(slug, loadPage);

async function load() {
  loading.value = true;
  try {
    const { data } = await wiki.index(auth.activeTenantId);
    pages.value = data;
  } catch (error) {
    pages.value = [];
    toast.error(error.response?.data?.message || 'Não deu para abrir a base.');
  } finally {
    loading.value = false;
  }
  await loadPage();
}

async function loadPage() {
  if (!slug.value) {
    page.value = null;
    attachments.value = [];
    return;
  }
  try {
    const [one, files] = await Promise.all([
      wiki.page(auth.activeTenantId, slug.value),
      wiki.attachments(auth.activeTenantId, slug.value),
    ]);
    page.value = one.data;
    attachments.value = files.data;
  } catch (error) {
    page.value = null;
    attachments.value = [];
    toast.error(error.response?.status === 404 ? 'Página não encontrada.' : 'Não deu para abrir a página.');
  }
}

function open(next) {
  router.push({ name: 'wikiPage', params: { slug: next } });
}

function startNew() {
  router.push({ name: 'wikiNew' });
}

function startEdit() {
  router.push({ name: 'wikiEdit', params: { slug: slug.value } });
}

async function remove() {
  if (!window.confirm(`Apagar "${page.value.title}"? As páginas abaixo dela sobem para a raiz.`)) {
    return;
  }
  try {
    await wiki.remove(auth.activeTenantId, slug.value);
    toast.success('Página apagada.');
    router.push({ name: 'wiki' });
    await load();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para apagar.');
  }
}

async function openHistory() {
  try {
    const { data } = await wiki.revisions(auth.activeTenantId, slug.value);
    history.value = data;
  } catch (error) {
    toast.error('Não deu para ler o histórico.');
  }
}

async function peek(revision) {
  try {
    const { data } = await wiki.revision(auth.activeTenantId, slug.value, revision.number);
    peeked.value = data;
  } catch (error) {
    toast.error('Não deu para abrir a versão.');
  }
}

async function restore(revision) {
  try {
    await wiki.restore(auth.activeTenantId, slug.value, revision.number);
    toast.success(`Voltou para a versão ${revision.number}.`);
    history.value = null;
    await loadPage();
  } catch (error) {
    toast.error('Não deu para restaurar.');
  }
}

async function downloadPdf() {
  try {
    const { data } = await wiki.pdf(auth.activeTenantId, slug.value);
    save(data, `${slug.value}.pdf`);
  } catch (error) {
    toast.error('Não deu para gerar o PDF.');
  }
}

async function downloadAttachment(item) {
  try {
    const { data } = await cloud.download(item.fileId);
    save(data, item.name);
  } catch (error) {
    toast.error('Não deu para baixar o anexo.');
  }
}

async function detach(item) {
  try {
    await wiki.detach(auth.activeTenantId, slug.value, item.fileId);
    attachments.value = attachments.value.filter((a) => a.fileId !== item.fileId);
  } catch (error) {
    toast.error('Não deu para tirar o anexo.');
  }
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function size(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
</script>

<style scoped>
.wiki {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

@media (max-width: 860px) {
  .wiki { grid-template-columns: 1fr; }
}

.wiki__index {
  position: sticky;
  top: 16px;
  padding: 14px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
}

.wiki__tree,
.wiki__children,
.wiki__attachments,
.wiki__revisions {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wiki__children { padding-left: 12px; }

.wiki__link {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.wiki__link:hover { background: var(--vc-surface-muted); }

.wiki__link.is-open {
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
  font-weight: 600;
}

.wiki__name { flex: 1; min-width: 0; }

.wiki__page {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
}

.wiki__files { margin-top: 8px; }

.wiki__attachments li,
.wiki__revisions li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-top: 1px solid var(--vc-border);
}

.wiki__revisions li { justify-content: space-between; }

.wiki__filename {
  flex: 1;
  border: none;
  background: none;
  padding: 0;
  color: var(--vc-purple-strong);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
</style>
