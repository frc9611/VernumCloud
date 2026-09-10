<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Página pública</h1>
        <span class="vc-chip vc-chip--purple">{{ auth.activeTenantName }}</span>
      </div>

      <p v-if="loading" class="vc-faint">Carregando a página...</p>

      <EmptyState v-else-if="switchedOff" title="A página pública está desligada nesta equipe">
        Quem administra a equipe liga o recurso em "Recursos da equipe". Enquanto isso, quem abre o
        endereço da página vê "Equipe não encontrada".
      </EmptyState>

      <EmptyState v-else-if="!page" title="Não deu para carregar a página">
        Tente de novo em instantes.
        <template #actions>
          <button class="vc-btn vc-btn--ghost" type="button" @click="load">Tentar de novo</button>
        </template>
      </EmptyState>

      <!-- A member without PAGE_MANAGE reads how the page stands, and nothing else -->
      <template v-else-if="!page.canManage">
        <AlertBanner variant="info" title="Só leitura." :aside="page.templateLabel">
          Editar a página pede a permissão "Editar a página pública da equipe", que um administrador concede.
        </AlertBanner>
        <PanelCard title="Como a página está" icon="globe" muted>
          <div class="vc-list">
            <div class="vc-list__item vc-list__item--plain">
              <div class="vc-list__text">
                <strong>Situação</strong>
                <span>{{ page.published ? 'Qualquer pessoa com o endereço vê a página.' : 'Só a equipe vê o que está aqui.' }}</span>
              </div>
              <span :class="['vc-badge', page.published ? 'vc-badge--on' : 'vc-badge--off']">
                {{ page.published ? 'Publicada' : 'Não publicada' }}
              </span>
            </div>
            <div class="vc-list__item vc-list__item--plain">
              <div class="vc-list__text">
                <strong>Endereço</strong>
                <span>{{ publicUrl }}</span>
              </div>
              <a v-if="page.published" class="vc-btn vc-btn--ghost vc-btn--small" :href="publicUrl" target="_blank" rel="noopener">
                Ver página
              </a>
            </div>
            <div class="vc-list__item vc-list__item--plain">
              <div class="vc-list__text">
                <strong>Modelo e título</strong>
                <span>{{ page.templateLabel }} · {{ page.headline || page.teamName }}</span>
              </div>
            </div>
            <div class="vc-list__item vc-list__item--plain">
              <div class="vc-list__text">
                <strong>Publicações</strong>
                <span>{{ page.publishedPostCount }} publicada(s), {{ page.draftPostCount }} em rascunho</span>
              </div>
            </div>
          </div>
        </PanelCard>
      </template>

      <template v-else>
        <AlertBanner variant="info" title="Escrita para quem não tem conta." icon="globe" :aside="page.templateLabel">
          Um patrocinador, uma escola, os pais: a página é o único pedaço da plataforma feito para eles.
          Nada aqui aparece na internet enquanto a página não estiver publicada.
        </AlertBanner>

        <!-- ------------------------------------------------------- address and publication -->
        <PanelCard title="Endereço e publicação" icon="link" muted>
          <div class="vc-field">
            <label class="vc-label" for="publicUrl">Endereço da página</label>
            <div class="vc-input-group">
              <input id="publicUrl" class="vc-input" type="text" readonly :value="publicUrl" />
              <button class="vc-btn vc-btn--icon" type="button" aria-label="Copiar endereço" title="Copiar endereço"
                      @click="copy(publicUrl)">
                <AppIcon name="copy" :size="16" />
              </button>
              <a class="vc-btn vc-btn--outline open-link" :href="publicUrl" target="_blank" rel="noopener">
                Ver página
                <AppIcon name="externalLink" :size="15" />
              </a>
            </div>
            <span class="vc-faint">
              O endereço nunca muda: pode ir em banner e assinatura de e-mail. Enquanto a página não está
              publicada, quem o abre vê "Equipe não encontrada" — você também.
            </span>
          </div>

          <div class="vc-switch">
            <div class="vc-switch__body">
              <strong>{{ page.published ? 'Publicada na internet' : 'Ainda não publicada' }}</strong>
              <p>
                {{ page.published
                  ? 'Qualquer pessoa com o endereço vê a apresentação, as publicações e as vagas abertas.'
                  : 'Só quem está na equipe vê o que está aqui. Publique quando a apresentação estiver pronta.' }}
              </p>
            </div>
            <button
              type="button"
              :class="['vc-switch__toggle', page.published ? 'is-on' : '']"
              :aria-pressed="page.published ? 'true' : 'false'"
              :disabled="publishing"
              @click="togglePublished"
            >
              <AppIcon :name="page.published ? 'toggleOn' : 'toggleOff'" :size="18" />
              {{ page.published ? 'Publicada' : 'Não publicada' }}
            </button>
          </div>
        </PanelCard>

        <!-- ---------------------------------------------------------------------- template -->
        <SectionTitle lead="Modelo" title="da Página" />
        <div class="templates">
          <button
            v-for="template in TEMPLATES"
            :key="template.name"
            type="button"
            :class="['template', { 'is-selected': form.template === template.name }]"
            :aria-pressed="form.template === template.name ? 'true' : 'false'"
            @click="form.template = template.name"
          >
            <TemplatePreview :template="template.name" />
            <strong class="template__name">{{ template.label }}</strong>
            <span class="template__hint">{{ template.hint }}</span>
          </button>
        </div>

        <!-- ------------------------------------------------------------------------ fields -->
        <SectionTitle lead="Apresentação e" title="Contato">
          <template #actions>
            <span v-if="dirty" class="vc-chip vc-chip--warning">alterações não salvas</span>
            <button v-if="dirty" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="discard">
              Descartar
            </button>
            <button class="vc-btn vc-btn--small" type="button" :disabled="!dirty || saving" @click="save">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </template>
        </SectionTitle>

        <PanelCard title="O que a página diz" icon="edit" muted>
          <div class="vc-field">
            <label class="vc-label" for="headline">Título</label>
            <input id="headline" class="vc-input" type="text" maxlength="120" v-model="form.headline"
                   :placeholder="page.teamName" />
            <span class="vc-faint">Sem título, a página mostra o nome da equipe.</span>
          </div>
          <div class="vc-field">
            <label class="vc-label" for="subheadline">Subtítulo</label>
            <input id="subheadline" class="vc-input" type="text" maxlength="200" v-model="form.subheadline"
                   placeholder="Uma frase sobre o que a equipe faz" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="about">Apresentação</label>
            <textarea id="about" class="vc-textarea" rows="7" maxlength="4000" v-model="form.about"
                      placeholder="Quem é a equipe, desde quando existe, o que constrói e o que já conquistou."></textarea>
            <span class="vc-faint">{{ form.about.length }} / 4000</span>
          </div>

          <div class="vc-divider"></div>

          <div class="vc-grid">
            <div class="vc-field">
              <label class="vc-label" for="contactEmail">E-mail de contato</label>
              <input id="contactEmail" class="vc-input" type="email" maxlength="160" v-model="form.contactEmail"
                     placeholder="equipe@escola.edu.br" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="contactPhone">Telefone</label>
              <input id="contactPhone" class="vc-input" type="tel" maxlength="40" v-model="form.contactPhone"
                     placeholder="(11) 90000-0000" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="location">Localização</label>
              <input id="location" class="vc-input" type="text" maxlength="200" v-model="form.location"
                     placeholder="Escola, cidade" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="website">Site</label>
              <input id="website" class="vc-input" type="text" maxlength="200" v-model="form.website"
                     placeholder="https://equipe.com.br" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="instagram">Instagram</label>
              <input id="instagram" class="vc-input" type="text" maxlength="120" v-model="form.instagram"
                     placeholder="@equipe ou o endereço do perfil" />
            </div>
            <div class="vc-field">
              <label class="vc-label" for="youtube">YouTube</label>
              <input id="youtube" class="vc-input" type="text" maxlength="200" v-model="form.youtube"
                     placeholder="https://youtube.com/@equipe" />
            </div>
          </div>

          <div class="vc-divider"></div>

          <div class="vc-grid">
            <div class="vc-field">
              <label class="vc-label" for="accent">Cor de destaque</label>
              <div class="vc-row accent">
                <input id="accent" class="accent__input" type="color" :value="accentShown"
                       @input="form.accent = $event.target.value" />
                <code class="accent__value">{{ accentShown.toUpperCase() }}</code>
                <span v-if="!form.accent" class="vc-chip">cor da equipe</span>
                <button v-else class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="form.accent = ''">
                  Usar a cor da equipe
                </button>
              </div>
              <span class="vc-faint">Pinta títulos, links e botões da página. Por padrão é a cor da equipe no dashboard.</span>
            </div>
            <div class="vc-field">
              <span class="vc-label">Vagas</span>
              <label class="vc-checkbox">
                <input type="checkbox" v-model="form.showProcesses" />
                Mostrar na página os processos seletivos com inscrições abertas, com o botão "Candidatar"
              </label>
            </div>

            <!--
              Os dois convites. A página tem dois leitores — quem quer entrar e quem pode patrocinar —
              e cada um precisa de uma frase escrita para ele; sem isso os dois leem a mesma
              apresentação institucional e nenhum sabe o que fazer em seguida.
            -->
            <div class="vc-field">
              <label class="vc-label" for="pg-join">Convite para quem quer entrar</label>
              <textarea id="pg-join" class="vc-input" rows="2" maxlength="400" v-model="form.joinPitch"
                        placeholder="Inscrições abrem duas vezes por ano e não precisa saber nada antes."></textarea>
              <span class="vc-faint">
                Aparece na seção "Quero entrar" — inclusive fora da janela de inscrição, para quem chegou
                antes da hora saber que existe uma.
              </span>
            </div>

            <div class="vc-field">
              <label class="vc-label" for="pg-sponsor">Convite para patrocínio</label>
              <textarea id="pg-sponsor" class="vc-input" rows="2" maxlength="400" v-model="form.sponsorPitch"
                        placeholder="Seu apoio vira ferramenta na bancada e estudante na competição."></textarea>
            </div>

            <div class="vc-field">
              <label class="vc-label" for="pg-sponsor-mail">E-mail de patrocínio</label>
              <input id="pg-sponsor-mail" class="vc-input" type="email" maxlength="160"
                     v-model="form.sponsorEmail" placeholder="patrocinio@suaequipe.com" />
              <span class="vc-faint">
                Separado do contato geral: quem quer apoiar não deveria cair na mesma caixa de quem quer
                se inscrever.
              </span>
            </div>

            <div class="vc-field">
              <span class="vc-label">Números</span>
              <label class="vc-checkbox">
                <input type="checkbox" v-model="form.showStats" />
                Mostrar pessoas, áreas, eventos e prêmios — apurados do próprio Vernum, nunca digitados
              </label>
              <span class="vc-faint">
                É o bloco que um patrocinador lê primeiro. Desligue se a equipe é nova e os números ainda
                não contam a história dela.
              </span>
            </div>
          </div>

          <template #footer>
            <button class="vc-btn vc-btn--ghost" type="button" :disabled="!dirty" @click="discard">Descartar</button>
            <button class="vc-btn" type="button" :disabled="!dirty || saving" @click="save">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </template>
        </PanelCard>

        <!-- ------------------------------------------------------------------------ images -->
        <SectionTitle lead="Logo e" title="Capa" />
        <div class="vc-grid">
          <PanelCard v-for="kind in IMAGE_KINDS" :key="kind.key" :title="kind.title" icon="image" muted>
            <p class="vc-faint" style="margin-top: 0">{{ kind.hint }}</p>
            <div :class="['image', 'image--' + kind.key]">
              <img v-if="images[kind.key]" :src="images[kind.key]" :alt="kind.title + ' da equipe'" />
              <span v-else class="vc-faint">Sem {{ kind.title.toLowerCase() }}</span>
            </div>
            <template #footer>
              <label class="vc-btn vc-btn--outline vc-btn--small upload">
                {{ page[kind.flag] ? 'Trocar' : 'Enviar' }}
                <input class="upload__file" type="file" :accept="IMAGE_TYPES" @change="uploadImage(kind, $event)" />
              </label>
              <button v-if="page[kind.flag]" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                      @click="removeImage(kind)">
                Remover
              </button>
              <span class="vc-faint">PNG, JPEG, WebP ou GIF até 5 MB</span>
            </template>
          </PanelCard>
        </div>

        <!-- ------------------------------------------------------------------------- posts -->
        <SectionTitle lead="Publicações" title="da Equipe">
          <template #actions>
            <span class="vc-chip">{{ page.publishedPostCount }} publicada(s) · {{ page.draftPostCount }} rascunho(s)</span>
            <button class="vc-btn vc-btn--small" type="button" @click="openCreatePost">Nova publicação</button>
          </template>
        </SectionTitle>

        <EmptyState v-if="!posts.length" title="Nenhuma publicação ainda">
          Uma notícia da competição, uma conquista, um agradecimento a quem patrocina. Rascunhos ficam só
          aqui; o que está publicado aparece na página.
          <template #actions>
            <button class="vc-btn" type="button" @click="openCreatePost">Escrever a primeira</button>
          </template>
        </EmptyState>

        <PanelCard v-for="post in posts" :key="post.postId" :title="post.title" muted>
          <template #header-actions>
            <span :class="['vc-badge', post.status === 'PUBLISHED' ? 'vc-badge--on' : 'vc-badge--neutral']"
                  style="margin-left: auto">
              {{ post.statusLabel }}
            </span>
          </template>
          <div class="post">
            <img v-if="postCovers[post.postId]" class="post__cover" :src="postCovers[post.postId]" alt="" />
            <div class="post__text">
              <p class="vc-faint" style="margin: 0">
                <template v-if="post.publishedAt">Publicada em {{ formatDateTime(post.publishedAt) }}</template>
                <template v-else>Criada em {{ formatDateTime(post.createdAt) }}</template>
                <template v-if="post.authorName"> · {{ post.authorName }}</template>
              </p>
              <p v-if="post.summary" class="post__summary">{{ post.summary }}</p>
              <p v-if="post.body" class="vc-muted post__excerpt">{{ excerpt(post.body) }}</p>
            </div>
          </div>
          <template #footer>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEditPost(post)">Editar</button>
            <button class="vc-btn vc-btn--outline vc-btn--small" type="button" :disabled="busyPost === post.postId"
                    @click="togglePostStatus(post)">
              {{ post.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}
            </button>
            <label class="vc-btn vc-btn--ghost vc-btn--small upload">
              {{ post.hasCover ? 'Trocar capa' : 'Capa' }}
              <input class="upload__file" type="file" :accept="IMAGE_TYPES" @change="uploadPostCover(post, $event)" />
            </label>
            <button v-if="post.hasCover" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                    @click="removePostCover(post)">
              Tirar capa
            </button>
            <span class="vc-spacer"></span>
            <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removePost(post)">Remover</button>
          </template>
        </PanelCard>
      </template>
    </div>

    <ModalDialog v-if="editingPost" :title="postForm.postId ? 'Editar publicação' : 'Nova publicação'" wide
                 @close="editingPost = false">
      <div class="vc-field">
        <label class="vc-label" for="postTitle">Título *</label>
        <input id="postTitle" class="vc-input" type="text" maxlength="200" v-model="postForm.title"
               placeholder="Equipe classificada para a etapa nacional" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="postSummary">Resumo</label>
        <input id="postSummary" class="vc-input" type="text" maxlength="300" v-model="postForm.summary"
               placeholder="Uma ou duas frases: é o que aparece antes do 'ler mais'" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="postBody">Texto</label>
        <textarea id="postBody" class="vc-textarea" rows="12" maxlength="30000" v-model="postForm.body"
                  placeholder="O texto completo. As quebras de linha são mantidas na página."></textarea>
        <span class="vc-faint">{{ postForm.body.length }} / 30000</span>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="postStatus">Situação</label>
        <select id="postStatus" class="vc-select" v-model="postForm.status">
          <option value="DRAFT">Rascunho — só a equipe vê</option>
          <option value="PUBLISHED">Publicado — aparece na página</option>
        </select>
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editingPost = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="savingPost" @click="savePost">
          {{ savingPost ? 'Salvando...' : 'Salvar' }}
        </button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import PanelCard from '@/components/PanelCard.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppIcon from '@/components/AppIcon.vue';
import TemplatePreview from '@/components/page/TemplatePreview.vue';
import { authStore } from '@/store/auth.js';
import { page as pageApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { formatDateTime as formatMoment } from '@/services/time.js';

/*
 * The editor of the team's public page.
 *
 * The text of the page is edited locally and saved in one request that carries only what changed:
 * the server keeps what it does not receive and clears what comes empty. Publishing and the images
 * are their own actions, applied at once — they never wait for the "Salvar" of the text. The images
 * behind /tenants/... need the token, so they are fetched as blobs and shown through object URLs,
 * revoked when replaced.
 */
const auth = authStore();
const toast = useToast();

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

const TEMPLATES = [
  { name: 'CLASSIC', label: 'Clássico', hint: 'Logo à esquerda, texto à direita, publicações em lista.' },
  { name: 'BOLD', label: 'Impacto', hint: 'Capa em toda a largura com o título por cima, publicações em cards.' },
  { name: 'MINIMAL', label: 'Minimalista', hint: 'Uma coluna, quase só texto, a cor de destaque com parcimônia.' },
];

const IMAGE_KINDS = [
  {
    key: 'logo', title: 'Logo', flag: 'hasLogo',
    hint: 'Aparece ao lado do nome em todos os modelos. Quadrada, de preferência, PNG com fundo transparente.',
    blob: pageApi.logoBlob, upload: pageApi.uploadLogo, remove: pageApi.removeLogo,
  },
  {
    key: 'cover', title: 'Capa', flag: 'hasCover',
    hint: 'Uma foto larga. No modelo Impacto ela ocupa o topo da página, com o título por cima; nos outros dois não aparece.',
    blob: pageApi.coverBlob, upload: pageApi.uploadCover, remove: pageApi.removeCover,
  },
];

/* The fields saved together by "Salvar". A text field sent as '' is cleared on the server. */
const TEXT_FIELDS = [
  'headline', 'subheadline', 'about', 'contactEmail', 'contactPhone',
  'instagram', 'youtube', 'website', 'location', 'accent',
  'joinPitch', 'sponsorPitch', 'sponsorEmail',
];
const FIELDS = [...TEXT_FIELDS, 'template', 'showProcesses', 'showStats'];

const page = ref(null);
const posts = ref([]);
const loading = ref(true);
const switchedOff = ref(false);
const saving = ref(false);
const publishing = ref(false);

const form = reactive(blankForm());
/* What the server has, so the save can send only the difference */
const saved = reactive(blankForm());

/* Object URLs of the logo and the cover, by kind; and of each post cover, by post id */
const images = reactive({ logo: null, cover: null });
const postCovers = reactive({});
/* Which version of the post each cover URL was made for, so a reload does not refetch unchanged files */
const postCoverKeys = {};

const editingPost = ref(false);
const savingPost = ref(false);
const busyPost = ref(null);
const postForm = reactive(blankPost());

const publicUrl = computed(() => (page.value ? window.location.origin + page.value.publicPath : ''));
/* What the colour input shows: the accent chosen, else the team colour, else the default purple */
const accentShown = computed(() => form.accent || page.value?.color || '#8864ae');
const dirty = computed(() => FIELDS.some((field) => form[field] !== saved[field]));

onMounted(load);
watch(() => auth.activeTenantId, load);
onUnmounted(revokeAll);

function blankForm() {
  const values = { template: 'CLASSIC', showProcesses: true, showStats: true };
  TEXT_FIELDS.forEach((field) => { values[field] = ''; });
  return values;
}

function blankPost() {
  return { postId: null, title: '', summary: '', body: '', status: 'DRAFT' };
}

async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  switchedOff.value = false;
  try {
    const [pageAnswer, postList] = await Promise.all([
      pageApi.get(auth.activeTenantId),
      pageApi.posts(auth.activeTenantId),
    ]);
    applyPage(pageAnswer.data);
    posts.value = postList.data;
    await Promise.all([...IMAGE_KINDS.map(loadImage), loadPostCovers()]);
  } catch (error) {
    page.value = null;
    //A switched off feature answers 403; that is "desligado", not an error to toast
    if (!auth.featureOn('LANDING_PAGE')) {
      switchedOff.value = true;
    } else {
      toast.error(apiMessage(error, 'Erro ao carregar a página'));
    }
  } finally {
    loading.value = false;
  }
}

/** Takes the page as the server answered it and resets the form to it. */
function applyPage(data) {
  page.value = data;
  const values = fromDto(data);
  Object.assign(form, values);
  Object.assign(saved, values);
}

function fromDto(data) {
  const values = {
    template: data.template || 'CLASSIC',
    showProcesses: data.showProcesses !== false,
    showStats: data.showStats !== false,
  };
  TEXT_FIELDS.forEach((field) => { values[field] = data[field] || ''; });
  return values;
}

function discard() {
  Object.assign(form, saved);
}

async function save() {
  const body = {};
  FIELDS.forEach((field) => {
    if (form[field] !== saved[field]) body[field] = form[field];
  });
  if (!Object.keys(body).length) return;
  saving.value = true;
  try {
    const { data } = await pageApi.update(auth.activeTenantId, body);
    applyPage(data);
    toast.success('Página salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a página'));
  } finally {
    saving.value = false;
  }
}

/* Publishing is a switch of its own, outside the form: one click, saved at once. */
async function togglePublished() {
  publishing.value = true;
  try {
    const { data } = await pageApi.update(auth.activeTenantId, { published: !page.value.published });
    //Only the flag changed, so the form (and whatever is typed in it) is left alone
    page.value = data;
    toast.success(data.published ? 'Página publicada!' : 'Página fora do ar.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mudar a publicação da página'));
  } finally {
    publishing.value = false;
  }
}

/* ------------------------------------------------------------------- images */

async function loadImage(kind) {
  setImage(kind.key, null);
  if (!page.value?.[kind.flag]) return;
  try {
    const { data } = await kind.blob(auth.activeTenantId);
    setImage(kind.key, URL.createObjectURL(data));
  } catch (error) {
    //The page says there is an image but the file did not come: the box stays empty
  }
}

function setImage(key, url) {
  if (images[key]) URL.revokeObjectURL(images[key]);
  images[key] = url;
}

async function uploadImage(kind, event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const { data } = await kind.upload(auth.activeTenantId, file);
    page.value = data;
    await loadImage(kind);
    toast.success(`${kind.title} atualizada!`);
  } catch (error) {
    toast.error(apiMessage(error, `Erro ao enviar a ${kind.title.toLowerCase()}`));
  }
}

async function removeImage(kind) {
  if (!window.confirm(`Tirar a ${kind.title.toLowerCase()} da página?`)) return;
  try {
    const { data } = await kind.remove(auth.activeTenantId);
    page.value = data;
    setImage(kind.key, null);
    toast.info(`${kind.title} removida.`);
  } catch (error) {
    toast.error(apiMessage(error, `Erro ao remover a ${kind.title.toLowerCase()}`));
  }
}

async function loadPostCovers() {
  const alive = new Set(posts.value.map((post) => String(post.postId)));
  Object.keys(postCovers).forEach((postId) => {
    if (!alive.has(postId)) dropPostCover(postId);
  });
  await Promise.all(posts.value.map(async (post) => {
    if (!post.hasCover) {
      dropPostCover(post.postId);
      return;
    }
    if (postCovers[post.postId] && postCoverKeys[post.postId] === post.updatedAt) return;
    try {
      const { data } = await pageApi.postCoverBlob(post.postId);
      dropPostCover(post.postId);
      postCovers[post.postId] = URL.createObjectURL(data);
      postCoverKeys[post.postId] = post.updatedAt;
    } catch (error) {
      //Without the cover the post is still listed; only the thumbnail is missing
    }
  }));
}

function dropPostCover(postId) {
  if (postCovers[postId]) URL.revokeObjectURL(postCovers[postId]);
  delete postCovers[postId];
  delete postCoverKeys[postId];
}

function revokeAll() {
  Object.keys(images).forEach((key) => setImage(key, null));
  Object.keys(postCovers).forEach(dropPostCover);
}

/* -------------------------------------------------------------------- posts */

/** Reloads the posts and the page (for the counts) after any change to a post. */
async function refreshPosts() {
  try {
    const [pageAnswer, postList] = await Promise.all([
      pageApi.get(auth.activeTenantId),
      pageApi.posts(auth.activeTenantId),
    ]);
    page.value = pageAnswer.data;
    posts.value = postList.data;
    await loadPostCovers();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao recarregar as publicações'));
  }
}

function openCreatePost() {
  Object.assign(postForm, blankPost());
  editingPost.value = true;
}

function openEditPost(post) {
  Object.assign(postForm, {
    postId: post.postId,
    title: post.title,
    summary: post.summary || '',
    body: post.body || '',
    status: post.status,
  });
  editingPost.value = true;
}

async function savePost() {
  if (!postForm.title.trim()) {
    toast.warning('A publicação precisa de um título.');
    return;
  }
  savingPost.value = true;
  const body = { title: postForm.title, summary: postForm.summary, body: postForm.body, status: postForm.status };
  try {
    if (postForm.postId) {
      await pageApi.updatePost(postForm.postId, body);
    } else {
      await pageApi.createPost(auth.activeTenantId, body);
    }
    editingPost.value = false;
    await refreshPosts();
    toast.success('Publicação salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a publicação'));
  } finally {
    savingPost.value = false;
  }
}

async function togglePostStatus(post) {
  const status = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  busyPost.value = post.postId;
  try {
    await pageApi.updatePost(post.postId, { status });
    await refreshPosts();
    toast.success(status === 'PUBLISHED' ? 'Publicação no ar!' : 'Publicação voltou para rascunho.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mudar a situação da publicação'));
  } finally {
    busyPost.value = null;
  }
}

async function removePost(post) {
  if (!window.confirm(`Remover a publicação "${post.title}"? Não dá para desfazer.`)) return;
  try {
    await pageApi.removePost(post.postId);
    dropPostCover(post.postId);
    await refreshPosts();
    toast.info('Publicação removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover a publicação'));
  }
}

async function uploadPostCover(post, event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    await pageApi.uploadPostCover(post.postId, file);
    dropPostCover(post.postId);
    await refreshPosts();
    toast.success('Capa da publicação atualizada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar a capa'));
  }
}

async function removePostCover(post) {
  try {
    await pageApi.removePostCover(post.postId);
    dropPostCover(post.postId);
    await refreshPosts();
    toast.info('Capa removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover a capa'));
  }
}

/* ------------------------------------------------------------------ helpers */

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Endereço copiado!');
  } catch (error) {
    toast.warning('Não deu para copiar. Selecione o endereço e copie manualmente.');
  }
}

function formatDateTime(value) {
  return formatMoment(value) || '—';
}

function excerpt(text) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > 220 ? flat.slice(0, 220).trimEnd() + '…' : flat;
}
</script>

<style scoped>
.open-link {
  white-space: nowrap;
}

/* Template picker */
.templates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.template {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  text-align: left;
  background: var(--vc-surface);
  border: 2px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  color: var(--vc-text);
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.template:hover {
  border-color: var(--vc-border-strong);
}

.template.is-selected {
  border-color: var(--vc-purple);
  box-shadow: 0 0 0 3px var(--vc-focus-ring);
}

.template__name {
  font-size: 0.95rem;
}

.template__hint {
  font-size: 0.8rem;
  color: var(--vc-text-muted);
}

/* Accent colour */
.accent {
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.accent__input {
  width: 44px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--vc-border-strong);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  cursor: pointer;
}

.accent__value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vc-surface-muted);
}

/* Image previews */
.image {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  overflow: hidden;
  background: var(--vc-surface-muted);
  border: 1px dashed var(--vc-border-strong);
  border-radius: var(--vc-radius);
}

.image img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
}

.image--cover {
  aspect-ratio: 21 / 9;
}

.image--cover img {
  width: 100%;
  height: 100%;
  max-height: none;
  object-fit: cover;
}

/* A button that is really a file input: the input stays reachable by keyboard, just not visible */
.upload {
  position: relative;
  overflow: hidden;
}

.upload__file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* Posts */
.post {
  display: flex;
  gap: 14px;
}

.post__cover {
  flex: none;
  width: 160px;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--vc-radius);
}

.post__text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.post__summary {
  margin: 0;
  font-weight: 500;
}

.post__excerpt {
  margin: 0;
  font-size: 0.9rem;
}

@media (max-width: 560px) {
  .post {
    flex-direction: column;
  }

  .post__cover {
    width: 100%;
  }
}
</style>
