<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">{{ slug ? 'Editar página' : 'Nova página' }}</h1>
        <div class="vc-row" style="gap: 8px">
          <button class="vc-btn vc-btn--ghost" type="button" @click="cancel">Cancelar</button>
          <button class="vc-btn" type="button" :disabled="!form.title.trim() || saving" @click="save">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>

      <!-- Modelo só na criação: aplicar um modelo por cima de uma página escrita apagaria o texto -->
      <section v-if="!slug" class="vc-stack ed__templates">
        <SectionTitle title="Começar de um modelo" />
        <div class="ed__models">
          <button v-for="model in templates" :key="model.templateId" type="button"
                  :class="['ed__model', form.templateId === model.templateId ? 'is-picked' : '']"
                  @click="pick(model)">
            <AppIcon :name="model.icon || 'file'" :size="18" />
            <strong>{{ model.name }}</strong>
            <span class="vc-faint">{{ model.description }}</span>
            <span v-if="model.ownTeam" class="vc-chip">da equipe</span>
          </button>
          <button type="button" :class="['ed__model', form.templateId === null ? 'is-picked' : '']"
                  @click="pick(null)">
            <AppIcon name="edit" :size="18" />
            <strong>Em branco</strong>
            <span class="vc-faint">Começar do zero.</span>
          </button>
        </div>
      </section>

      <div class="ed__meta">
        <div class="vc-field">
          <label class="vc-label" for="ed-title">Título</label>
          <input id="ed-title" class="vc-input" type="text" v-model="form.title" maxlength="160"
                 placeholder="Trocar a bateria" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="ed-summary">Resumo</label>
          <input id="ed-summary" class="vc-input" type="text" v-model="form.summary" maxlength="300"
                 placeholder="Uma linha dizendo para que serve" />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="ed-parent">Dentro de</label>
          <select id="ed-parent" class="vc-input" v-model="form.parentId">
            <option :value="0">Raiz da base</option>
            <option v-for="p in parents" :key="p.pageId" :value="p.pageId">{{ p.title }}</option>
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="ed-note">Nota da versão</label>
          <input id="ed-note" class="vc-input" type="text" v-model="form.note" maxlength="200"
                 placeholder="O que mudou" />
        </div>
      </div>

      <label class="ed__publish">
        <input type="checkbox" v-model="form.published" />
        <span>
          <strong>Publicada.</strong>
          <span class="vc-faint">
            Enquanto estiver desmarcada é um rascunho: some do índice de quem só lê a base.
          </span>
        </span>
      </label>

      <div class="ed__split">
        <div class="vc-stack">
          <div class="vc-row vc-row--between">
            <span class="vc-label">Markdown</span>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                    :disabled="!slug || uploading" @click="picker?.click()">
              <AppIcon name="image" :size="14" />
              {{ uploading ? 'Enviando...' : 'Inserir imagem' }}
            </button>
          </div>
          <textarea ref="editor" class="vc-input ed__area" v-model="form.content" spellcheck="false"
                    placeholder="# Título&#10;&#10;Escreva em markdown. Cole uma imagem direto aqui."
                    @paste="onPaste"></textarea>
          <p class="vc-faint" style="margin: 0">
            <template v-if="slug">Cole uma imagem no texto e ela vira um arquivo da equipe.</template>
            <template v-else>Salve a página uma vez para poder inserir imagens nela.</template>
          </p>
          <input ref="picker" type="file" accept="image/*" hidden @change="onPick" />
        </div>

        <div class="vc-stack">
          <span class="vc-label">Como vai ficar</span>
          <div class="ed__preview">
            <MarkdownView :content="form.content" :tenant-id="auth.activeTenantId" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import MarkdownView from '@/components/wiki/MarkdownView.vue';
import { authStore } from '@/store/auth.js';
import { wiki } from '@/services/api.js';

/*
 * O editor: markdown de um lado, como vai ficar do outro.
 *
 * Uma imagem colada no editor é enviada na hora e vira um arquivo da equipe, e o que entra no texto é
 * o endereço dela. Isso só funciona numa página que já existe — a imagem precisa de uma página para
 * pendurar —, então numa página nova o botão fica desligado e o texto diz por quê, em vez de deixar a
 * pessoa colar e receber um erro.
 */
const auth = authStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const slug = computed(() => route.params.slug || '');

const templates = ref([]);
const parents = ref([]);
const saving = ref(false);
const uploading = ref(false);
const editor = ref(null);
const picker = ref(null);

const form = reactive({
  title: '', summary: '', content: '', parentId: 0, templateId: null, published: true, note: '',
});

onMounted(async () => {
  try {
    const [models, index] = await Promise.all([
      wiki.templates(auth.activeTenantId),
      wiki.index(auth.activeTenantId),
    ]);
    templates.value = models.data;
    parents.value = index.data.filter((p) => p.slug !== slug.value);
  } catch (error) {
    toast.error('Não deu para carregar os modelos.');
  }
  if (slug.value) {
    try {
      const { data } = await wiki.page(auth.activeTenantId, slug.value);
      form.title = data.title;
      form.summary = data.summary || '';
      form.content = data.content || '';
      form.parentId = data.parentId || 0;
      form.published = !!data.published;
    } catch (error) {
      toast.error('Não deu para abrir a página.');
      router.push({ name: 'wiki' });
    }
  }
});

function pick(model) {
  form.templateId = model ? model.templateId : null;
  //Só preenche o que está vazio: trocar de modelo não pode apagar o que a pessoa já escreveu
  if (model && !form.content.trim()) {
    form.content = model.content;
  }
}

async function save() {
  saving.value = true;
  try {
    if (slug.value) {
      await wiki.update(auth.activeTenantId, slug.value, {
        title: form.title,
        summary: form.summary,
        content: form.content,
        parentId: form.parentId,
        published: form.published,
        note: form.note || null,
      });
      toast.success('Página salva.');
      router.push({ name: 'wikiPage', params: { slug: slug.value } });
    } else {
      const { data } = await wiki.create(auth.activeTenantId, {
        title: form.title,
        summary: form.summary,
        content: form.content,
        parentId: form.parentId || null,
        templateId: form.content.trim() ? null : form.templateId,
        published: form.published,
      });
      toast.success('Página criada.');
      router.push({ name: 'wikiPage', params: { slug: data.slug } });
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para salvar.');
  } finally {
    saving.value = false;
  }
}

function cancel() {
  if (slug.value) router.push({ name: 'wikiPage', params: { slug: slug.value } });
  else router.push({ name: 'wiki' });
}

function onPaste(event) {
  const item = [...(event.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
  if (!item || !slug.value) return;
  event.preventDefault();
  upload(item.getAsFile());
}

function onPick(event) {
  const file = event.target.files?.[0];
  if (file) upload(file);
  event.target.value = '';
}

async function upload(file) {
  if (!file || !slug.value) return;
  uploading.value = true;
  try {
    const { data } = await wiki.uploadImage(auth.activeTenantId, slug.value, file);
    insert(`\n![${data.name}](/tenants/${auth.activeTenantId}/wiki/images/${data.fileId})\n`);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não deu para enviar a imagem.');
  } finally {
    uploading.value = false;
  }
}

/* No cursor, e não no fim: colar uma imagem no meio de um parágrafo tem que deixá-la ali. */
function insert(text) {
  const area = editor.value;
  if (!area) {
    form.content += text;
    return;
  }
  const start = area.selectionStart ?? form.content.length;
  const end = area.selectionEnd ?? start;
  form.content = form.content.slice(0, start) + text + form.content.slice(end);
}
</script>

<style scoped>
.ed__templates {
  padding: 14px;
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  background: var(--vc-surface);
}

.ed__models {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.ed__model {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
  background: var(--vc-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.ed__model:hover { border-color: var(--vc-purple-border); }

.ed__model.is-picked {
  border-color: var(--vc-purple);
  background: var(--vc-purple-soft);
}

.ed__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.ed__publish {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
  background: var(--vc-surface-muted);
  cursor: pointer;
}

.ed__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .ed__split { grid-template-columns: 1fr; }
}

.ed__area {
  min-height: 460px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.ed__preview {
  min-height: 460px;
  padding: 16px;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
  background: var(--vc-surface);
  overflow-x: auto;
}
</style>
