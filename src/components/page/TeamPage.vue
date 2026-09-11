<template>
  <article :class="['page', 'page--' + variant]">
    <header class="page__hero">
      <!-- Impacto: the cover fills the hero and the headline sits over it; without a cover, a block of accent -->
      <div v-if="variant === 'bold'" class="page__cover" :style="coverStyle">
        <div class="page__cover-shade"></div>
      </div>

      <div class="page__head">
        <img v-if="page.hasLogo" class="page__logo" :src="imageUrl(page.logoPath)" :alt="'Logo de ' + page.teamName" />
        <div v-else class="page__logo page__logo--blank" aria-hidden="true">{{ monogram }}</div>

        <div class="page__identity">
          <p class="page__team">
            <span>{{ page.teamName }}</span>
            <span v-if="page.teamNumber" class="page__number">#{{ page.teamNumber }}</span>
          </p>
          <h1 class="page__headline">{{ page.headline || page.teamName }}</h1>
          <p v-if="page.subheadline" class="page__subheadline">{{ page.subheadline }}</p>
        </div>
      </div>
    </header>

    <div class="page__body">
      <section v-if="page.about" class="page__section">
        <h2 class="page__title">Sobre</h2>
        <p class="page__text">{{ page.about }}</p>
      </section>

      <!--
        Os números vêm antes de tudo que se pede: quem lê esta página decidindo se apoia a equipe
        decide por eles, e eles são apurados do banco em vez de digitados — um número escrito à mão
        envelhece na página.
      -->
      <section v-if="page.stats" class="page__section">
        <h2 class="page__title">A equipe em números</h2>
        <div class="page__numbers">
          <div v-for="item in numbers" :key="item.label" class="page__stat">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <p v-if="page.stats.since" class="page__meta">
          Na plataforma desde {{ page.stats.since }}.
        </p>
      </section>

      <section v-if="page.areas && page.areas.length" class="page__section">
        <h2 class="page__title">O que a equipe faz</h2>
        <p class="page__text">Estas são as áreas — é numa delas que você entraria.</p>
        <div class="page__areas">
          <article v-for="area in page.areas" :key="area.name" class="page__area"
                   :style="{ '--area': area.color || 'currentColor' }">
            <strong>{{ area.name }}</strong>
            <p v-if="area.description">{{ area.description }}</p>
          </article>
        </div>
      </section>

      <!--
        O convite de patrocínio é uma seção própria e não uma linha no contato: quem pode apoiar não
        está lendo a mesma página que quem quer entrar, e um e-mail no meio de uma lista de links não
        é um convite.
      -->
      <section v-if="page.sponsorPitch || page.sponsorEmail" class="page__section page__sponsor">
        <h2 class="page__title">Apoie a equipe</h2>
        <p v-if="page.sponsorPitch" class="page__text">{{ page.sponsorPitch }}</p>
        <a v-if="page.sponsorEmail" class="page__btn" :href="'mailto:' + page.sponsorEmail">
          Falar sobre patrocínio
        </a>
      </section>

      <section v-if="hasContact" class="page__section">
        <h2 class="page__title">Contato</h2>
        <ul class="page__links">
          <li v-if="page.contactEmail">
            <AppIcon name="mail" :size="16" />
            <a :href="'mailto:' + page.contactEmail">{{ page.contactEmail }}</a>
          </li>
          <li v-if="page.contactPhone">
            <AppIcon name="phone" :size="16" />
            <a v-if="phoneHref" :href="phoneHref">{{ page.contactPhone }}</a>
            <span v-else>{{ page.contactPhone }}</span>
          </li>
          <li v-if="page.location">
            <AppIcon name="mapPin" :size="16" />
            <span>{{ page.location }}</span>
          </li>
          <li v-if="page.website">
            <AppIcon name="link" :size="16" />
            <a :href="page.website" target="_blank" rel="noopener">{{ hostOf(page.website) }}</a>
          </li>
          <li v-if="page.instagram">
            <AppIcon name="instagram" :size="16" />
            <a :href="instagramUrl" target="_blank" rel="noopener">{{ instagramLabel }}</a>
          </li>
          <li v-if="page.youtube">
            <AppIcon name="youtube" :size="16" />
            <a :href="page.youtube" target="_blank" rel="noopener">YouTube</a>
          </li>
        </ul>
      </section>

      <section v-if="page.joinPitch || (page.openProcesses && page.openProcesses.length)"
               class="page__section">
        <h2 class="page__title">Quero entrar</h2>
        <!--
          O convite aparece mesmo sem processo aberto: quem chegou aqui fora da janela de inscrição
          precisa saber que existe uma janela, e não encontrar a seção sumida.
        -->
        <p v-if="page.joinPitch" class="page__text">{{ page.joinPitch }}</p>
        <p v-if="page.joinPitch && !(page.openProcesses && page.openProcesses.length)" class="page__meta">
          Não há inscrições abertas agora.
        </p>
        <div class="page__processes">
          <article v-for="process in page.openProcesses" :key="process.publicToken" class="page__process">
            <div class="page__process-text">
              <strong>{{ process.name }}</strong>
              <p v-if="process.description" class="page__process-description">{{ process.description }}</p>
              <p v-if="process.endDate" class="page__meta">Inscrições até {{ formatDay(process.endDate) }}</p>
            </div>
            <router-link class="page__btn" :to="process.publicPath">Candidatar</router-link>
          </article>
        </div>
      </section>

      <!--
        A lista de publicações vem sem o corpo: um corpo tem até trinta mil caracteres, e mandar todos
        de uma vez era mandar a equipe inteira para quem veio ler uma publicação. O que a lista traz é o
        resumo ou o começo do texto; "ler mais" busca o corpo daquela publicação.
      -->
      <section v-if="posts.length" class="page__section">
        <h2 class="page__title">Publicações</h2>
        <div class="page__posts">
          <article v-for="post in posts" :key="post.postId" :class="['page__post', { 'has-cover': post.hasCover }]">
            <img v-if="post.hasCover" class="page__post-cover" :src="imageUrl(post.coverPath)" alt="" />
            <div class="page__post-body">
              <h3 class="page__post-title">{{ post.title }}</h3>
              <p class="page__meta">
                {{ formatDate(post.publishedAt) }}
                <template v-if="post.authorName"> · {{ post.authorName }}</template>
              </p>
              <p v-if="post.summary" class="page__post-summary">{{ post.summary }}</p>
              <p v-else-if="post.excerpt && !opened(post)" class="page__text">{{ post.excerpt }}</p>
              <p v-if="opened(post) && bodyOf(post)" class="page__text">{{ bodyOf(post) }}</p>
              <p v-if="opened(post) && !bodyOf(post)" class="vc-faint">Carregando...</p>
              <button v-if="hasMore(post)" class="page__more" type="button" @click="toggle(post)">
                {{ opened(post) ? 'Ler menos' : 'Ler mais' }}
              </button>
            </div>
          </article>
        </div>
        <button v-if="hasMorePosts" class="page__more" type="button" :disabled="loadingMore"
                @click="more">
          Ver mais publicações
        </button>
      </section>
    </div>

    <footer class="page__footer">
      <router-link to="/">Página feita com o Vernum</router-link>
    </footer>
  </article>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { formatDate as formatDateOf } from '@/services/time.js';

/*
 * The public page of a team, as a visitor reads it.
 *
 * The three templates the team can pick — Clássico, Impacto, Minimalista — are one component and
 * three CSS variants keyed on `page.template`: the same sections in the same order, laid out and
 * weighted differently. A new template is a constant on the server plus one more variant here.
 *
 * `imageUrl` turns the *Path fields of the DTO into something an <img> can load, so the same
 * component serves the public route (direct URLs) and, one day, an authenticated preview (blobs).
 *
 * `loadPost` e `loadMore` seguem a mesma ideia: quem sabe buscar é quem montou a página. Sem eles o
 * componente continua desenhando tudo que recebeu — é assim que uma pré-visualização, que já tem os
 * corpos em mãos, usa este arquivo sem precisar de rota nenhuma.
 */
const props = defineProps({
  page: { type: Object, required: true },
  imageUrl: { type: Function, required: true },
  /** Busca uma publicação inteira pelo id e devolve o DTO dela; a lista vem sem o corpo. */
  loadPost: { type: Function, default: null },
  /** Acrescenta a próxima página de publicações a `page.posts`. */
  loadMore: { type: Function, default: null },
});

const VARIANTS = { CLASSIC: 'classic', BOLD: 'bold', MINIMAL: 'minimal' };
/* O que o servidor põe no fim de um excerto que cortou: é por ele que se sabe que sobrou texto. */
const ELLIPSIS = '…';

const expanded = ref([]);
/* Corpo por id, buscado uma vez e guardado aqui em vez de escrito de volta na prop. */
const bodies = reactive({});
const loadingMore = ref(false);

const variant = computed(() => VARIANTS[props.page.template] || 'classic');

const posts = computed(() => props.page.posts || []);

const hasMorePosts = computed(() =>
  !!props.loadMore && posts.value.length < (props.page.postCount || 0));

const monogram = computed(() => {
  const words = String(props.page.teamName || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('') || '?';
});

const coverStyle = computed(() =>
  props.page.hasCover ? { backgroundImage: `url("${props.imageUrl(props.page.coverPath)}")` } : null,
);

/*
 * Os números, só os que dizem algo.
 *
 * Um zero é escondido de propósito: "0 prêmios" numa página de equipe nova é pior do que não dizer
 * nada, e a decisão de mostrar o bloco já foi tomada pela equipe no editor. Membros aparece sempre,
 * porque uma equipe sem membros não existiria para ter página.
 */
const numbers = computed(() => {
  const s = props.page.stats;
  if (!s) return [];
  const out = [{ value: s.members, label: s.members === 1 ? 'pessoa' : 'pessoas' }];
  if (s.divisions) out.push({ value: s.divisions, label: s.divisions === 1 ? 'área' : 'áreas' });
  if (s.events) out.push({ value: s.events, label: s.events === 1 ? 'evento' : 'eventos' });
  if (s.awards) out.push({ value: s.awards, label: s.awards === 1 ? 'prêmio' : 'prêmios' });
  if (s.seasons > 1) out.push({ value: s.seasons, label: 'temporadas' });
  return out;
});

const hasContact = computed(() =>
  ['contactEmail', 'contactPhone', 'location', 'website', 'instagram', 'youtube']
    .some((field) => !!props.page[field]),
);

/** A tel: link only when the text has enough digits to dial; otherwise the phone is just shown. */
const phoneHref = computed(() => {
  const digits = String(props.page.contactPhone || '').replace(/[^\d+]/g, '');
  return digits.replace(/\D/g, '').length >= 8 ? 'tel:' + digits : null;
});

/* The server keeps either a bare handle (without "@") or the full address the person pasted. */
const instagramUrl = computed(() => {
  const value = props.page.instagram || '';
  return value.startsWith('http') ? value : 'https://instagram.com/' + value;
});

const instagramLabel = computed(() => {
  const value = props.page.instagram || '';
  if (!value.startsWith('http')) return '@' + value;
  try {
    const handle = new URL(value).pathname.replace(/^\/+|\/+$/g, '');
    return handle ? '@' + handle : 'Instagram';
  } catch (error) {
    return 'Instagram';
  }
});

function opened(post) {
  return expanded.value.includes(post.postId);
}

/*
 * Se ainda há texto que a lista não mostrou. O excerto terminado em reticências é um corpo cortado, e
 * um resumo esconde o corpo inteiro atrás de si; sem nenhum dos dois o que está na tela já é a
 * publicação toda, e um "Ler mais" ali só busca de volta o mesmo texto — que era o que este arquivo
 * fazia antes de a lista parar de mandar o corpo, e sem botão nenhum.
 */
function hasMore(post) {
  return !!post.excerpt && (!!post.summary || post.excerpt.endsWith(ELLIPSIS));
}

/** O corpo já buscado, ou o que a própria lista trouxe quando ela traz corpo (pré-visualização). */
function bodyOf(post) {
  return bodies[post.postId] ?? post.body ?? null;
}

/**
 * Abre e fecha uma publicação, buscando o corpo na primeira vez que ela abre.
 *
 * <p>Sem `loadPost` — uma pré-visualização, por exemplo — o que já veio na lista é tudo que existe, e
 * o começo do texto fica no lugar do corpo em vez de a publicação ficar carregando para sempre.</p>
 */
async function toggle(post) {
  const index = expanded.value.indexOf(post.postId);
  if (index >= 0) {
    expanded.value.splice(index, 1);
    return;
  }
  expanded.value.push(post.postId);
  if (bodyOf(post) !== null) return;
  if (!props.loadPost) {
    bodies[post.postId] = post.excerpt;
    return;
  }
  try {
    const full = await props.loadPost(post.postId);
    bodies[post.postId] = (full && full.body) || post.excerpt;
  } catch (error) {
    //Uma página pública não tem toast: o texto fica no que a lista já trouxe
    bodies[post.postId] = post.excerpt;
  }
}

async function more() {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try {
    await props.loadMore();
  } catch (error) {
    //Outra vez sem toast: o botão continua ali, e apertar de novo é a tentativa seguinte
  } finally {
    loadingMore.value = false;
  }
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}

function formatDate(value) {
  return formatDateOf(value, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDay(value) {
  return formatDateOf(value);
}
</script>

<style scoped>
/* ------------------------------------------------------------- shared bones */
.page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 36px 0 40px;
  color: var(--vc-text);
}

.page__hero,
.page__body,
.page__footer {
  width: 100%;
  max-width: var(--vc-content-width);
  margin: 0 auto;
  padding: 0 20px;
}

.page__body {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.page__head {
  display: flex;
  align-items: center;
  gap: 22px;
}

.page__logo {
  flex: none;
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: var(--vc-radius-lg);
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
}

.page__logo--blank {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--vc-purple-strong);
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
}

.page__identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page__team {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vc-text-muted);
}

.page__number {
  font-weight: 500;
  color: var(--vc-purple-strong);
}

.page__headline {
  margin: 0;
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.page__subheadline {
  margin: 0;
  font-size: 1.1rem;
  color: var(--vc-text-muted);
}

.page__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.page__text {
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.page__meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--vc-text-faint);
}

.page__links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
}

.page__links li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--vc-text-muted);
  overflow-wrap: anywhere;
}

.page__links a,
.page__more,
.page__footer a:hover {
  color: var(--vc-purple-strong);
}

.page__links a {
  text-decoration: none;
}

.page__links a:hover {
  text-decoration: underline;
}

.page__processes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page__process {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
}

.page__process-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page__process-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vc-text-muted);
}

.page__btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: var(--vc-radius);
  background: var(--vc-purple);
  color: var(--vc-on-accent);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
}

.page__btn:hover {
  background: var(--vc-purple-strong);
}

.page__numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px;
}

/* `page__stat` e não `page__number`: o número da equipe no cabeçalho já usa aquele nome */
.page__stat {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border: 1px solid currentColor;
  border-radius: 10px;
  opacity: 0.95;
}

.page__stat strong {
  font-size: 30px;
  line-height: 1.1;
}

.page__stat span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.page__areas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.page__area {
  padding: 14px;
  border-left: 3px solid var(--area);
  border-radius: 6px;
  background: rgba(127, 127, 127, 0.08);
}

.page__area strong { display: block; margin-bottom: 4px; }
.page__area p { margin: 0; font-size: 13px; opacity: 0.85; }

/* A seção é um flex column, então sem isto o botão estica na largura toda da página */
.page__sponsor .page__btn {
  margin-top: 10px;
  align-self: flex-start;
  width: fit-content;
}

.page__posts {
  display: flex;
  flex-direction: column;
}

.page__post-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page__post-title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.page__post-summary {
  margin: 0;
  font-weight: 500;
  line-height: 1.5;
}

.page__more {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.page__more:hover {
  text-decoration: underline;
}

.page__footer {
  text-align: center;
  font-size: 0.8rem;
  color: var(--vc-text-faint);
}

/* The rule above the footer is drawn inside the padding, so it lines up with the content column */
.page__footer::before {
  content: '';
  display: block;
  height: 1px;
  margin-bottom: 14px;
  background: var(--vc-border);
}

.page__footer a {
  color: inherit;
  text-decoration: none;
}

/* ------------------------------------------------------------------ Clássico */
.page--classic .page__hero .page__head {
  padding: 28px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-top: 4px solid var(--vc-purple);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
}

.page--classic .page__section {
  padding: 22px 24px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
}

.page--classic .page__title {
  padding-left: 10px;
  border-left: 3px solid var(--vc-purple);
}

.page--classic .page__post {
  padding: 16px 0;
  border-top: 1px solid var(--vc-border);
}

.page--classic .page__post:first-child {
  padding-top: 0;
  border-top: 0;
}

.page--classic .page__post:last-child {
  padding-bottom: 0;
}

.page--classic .page__post.has-cover {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 18px;
}

.page--classic .page__post-cover {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--vc-radius);
}

/* ------------------------------------------------------------------- Impacto */
.page--bold {
  padding-top: 0;
}

.page--bold .page__hero {
  position: relative;
  max-width: none;
  min-height: 400px;
  padding: 0;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  background: linear-gradient(135deg, var(--vc-purple), var(--vc-purple-strong));
  color: var(--vc-on-accent);
}

.page--bold .page__cover {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

/*
 * The shade that keeps the headline readable over any photo. The gradient is the accent going
 * from a hint at the top to almost solid at the bottom, where the text sits; the plain backdrop
 * before it is the fallback for a browser without color-mix().
 */
.page--bold .page__cover-shade {
  position: absolute;
  inset: 0;
  background: var(--vc-backdrop);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--vc-purple-strong) 20%, transparent) 0%,
    color-mix(in srgb, var(--vc-purple-strong) 88%, transparent) 100%
  );
}

.page--bold .page__head {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--vc-content-width);
  margin: 0 auto;
  padding: 56px 20px 40px;
  align-items: flex-end;
}

.page--bold .page__logo {
  width: 96px;
  height: 96px;
  border-color: var(--vc-surface);
}

.page--bold .page__team,
.page--bold .page__number,
.page--bold .page__subheadline {
  color: var(--vc-on-accent);
}

.page--bold .page__team {
  opacity: 0.85;
}

.page--bold .page__headline {
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  font-weight: 700;
}

.page--bold .page__subheadline {
  font-size: 1.25rem;
  opacity: 0.92;
}

.page--bold .page__body {
  padding-top: 8px;
}

.page--bold .page__title {
  font-size: 1.5rem;
  font-weight: 700;
}

.page--bold .page__section:first-child .page__text {
  font-size: 1.12rem;
}

.page--bold .page__process {
  border-left: 4px solid var(--vc-purple);
}

.page--bold .page__posts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.page--bold .page__post {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
}

.page--bold .page__post-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.page--bold .page__post-body {
  padding: 16px 18px 18px;
}

/* --------------------------------------------------------------- Minimalista */
.page--minimal .page__hero,
.page--minimal .page__body,
.page--minimal .page__footer {
  max-width: 680px;
}

.page--minimal .page__head {
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--vc-purple);
}

.page--minimal .page__logo {
  width: 56px;
  height: 56px;
  border-radius: var(--vc-radius);
}

.page--minimal .page__logo--blank {
  font-size: 1.1rem;
}

.page--minimal .page__number {
  color: var(--vc-text-muted);
}

.page--minimal .page__headline {
  font-size: 1.9rem;
  font-weight: 400;
}

.page--minimal .page__title {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vc-text-muted);
}

.page--minimal .page__links {
  flex-direction: column;
  gap: 8px;
}

.page--minimal .page__process {
  padding: 14px 0;
  background: none;
  border: 0;
  border-top: 1px solid var(--vc-border);
  border-radius: 0;
}

.page--minimal .page__btn {
  background: none;
  border: 1px solid var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

.page--minimal .page__btn:hover {
  background: var(--vc-purple-soft);
}

.page--minimal .page__post {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 0;
  border-top: 1px solid var(--vc-border);
}

.page--minimal .page__post-cover {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: var(--vc-radius);
}

.page--minimal .page__post-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.page--minimal .page__footer::before {
  background: var(--vc-purple-border);
}

/* ---------------------------------------------------------------- small screens */
@media (max-width: 640px) {
  .page__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .page__headline {
    font-size: 1.6rem;
  }

  .page__process {
    flex-direction: column;
    align-items: flex-start;
  }

  .page--classic .page__post.has-cover {
    grid-template-columns: 1fr;
  }

  .page--bold .page__hero {
    min-height: 300px;
  }

  /* Stacked, the logo goes back to the left: the desktop rule aligned the row to its bottom edge */
  .page--bold .page__head {
    align-items: flex-start;
    padding: 40px 20px 28px;
  }
}
</style>
