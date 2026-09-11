<template>
  <section class="vc-stack">
    <SectionTitle lead="Mural" title="de Avisos">
      <template #actions>
        <!-- O total é o da consulta inteira, não o das páginas já carregadas. -->
        <span v-if="total" class="vc-chip">{{ total }} {{ total === 1 ? 'aviso' : 'avisos' }}</span>
        <button
          v-if="scopes.length"
          class="vc-btn vc-btn--small"
          type="button"
          @click="composing = !composing"
        >
          <AppIcon :name="composing ? 'close' : 'megaphone'" :size="15" />
          {{ composing ? 'Fechar' : 'Publicar aviso' }}
        </button>
      </template>
    </SectionTitle>

    <!-- The composer only exists for whoever the server says may publish somewhere. -->
    <PanelCard v-if="composing && scopes.length" title="Novo aviso" icon="megaphone">
      <div class="vc-field">
        <label class="vc-label" for="announcement-scope">Quem vai receber</label>
        <select id="announcement-scope" class="vc-select" v-model="draft.target">
          <option v-for="option in scopes" :key="optionKey(option)" :value="optionKey(option)">
            {{ option.scope === 'DIVISION' ? 'Divisão ' + option.label : option.label }}
          </option>
        </select>
        <p class="vc-faint" style="margin: 6px 0 0">{{ scopeHint }}</p>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="announcement-title">Título</label>
        <input id="announcement-title" class="vc-input" type="text" v-model="draft.title"
               :maxlength="LIMIT" placeholder="Reunião geral de sexta" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="announcement-content">Aviso</label>
        <textarea id="announcement-content" class="vc-textarea" v-model="draft.content" rows="3"
                  :maxlength="LIMIT" placeholder="O que a equipe precisa saber."></textarea>
        <p class="vc-faint" style="margin: 6px 0 0">{{ draft.content.length }}/{{ LIMIT }} caracteres</p>
      </div>
      <template #footer>
        <span class="vc-faint">Todo mundo que receber o aviso pode comentar nele.</span>
        <span class="vc-spacer"></span>
        <button class="vc-btn vc-btn--ghost" type="button" @click="composing = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!draft.title.trim() || sending" @click="publish">
          {{ sending ? 'Publicando...' : 'Publicar' }}
        </button>
      </template>
    </PanelCard>

    <EmptyState v-if="!loading && !board.length" title="Nenhum aviso por enquanto">
      <template v-if="scopes.length">Publique o primeiro pelo botão acima.</template>
      <template v-else>Quando a equipe publicar um aviso, ele aparece aqui.</template>
    </EmptyState>

    <article v-for="item in board" :key="item.announcementId" class="vc-card vc-announcement">
      <header class="vc-announcement__head">
        <span :class="['vc-chip', scopeChip(item.scope)]">
          <AppIcon name="megaphone" :size="13" />
          {{ item.scope === 'DIVISION' ? item.divisionName : item.scopeLabel }}
        </span>
        <strong class="vc-announcement__title">{{ item.title }}</strong>
        <span class="vc-spacer"></span>
        <span class="vc-faint"><PersonLink :user-id="item.senderId" :name="item.senderName" muted /> · {{ formatWhen(item.createdAt) }}</span>
        <button
          v-if="item.canDelete"
          class="vc-btn vc-btn--ghost vc-btn--small vc-btn--icon"
          type="button"
          title="Remover aviso"
          @click="remove(item)"
        >
          <AppIcon name="trash" :size="15" />
        </button>
      </header>

      <div class="vc-announcement__body">
        <p v-if="item.content" style="margin: 0; white-space: pre-line">{{ item.content }}</p>
        <p v-else class="vc-faint" style="margin: 0">Sem detalhes.</p>
      </div>

      <footer class="vc-announcement__foot">
        <!--
          Os quatro tipos aparecem sempre, mesmo em zero: um botão que só existe depois de alguém
          clicar é um botão que ninguém clica primeiro. O número fica escondido no zero para a barra
          não ser uma fileira de zeros.
        -->
        <button
          v-for="tally in item.reactions || []"
          :key="tally.kind"
          :class="['vc-chip', 'vc-chip--button', 'reaction', tally.mine ? 'is-mine' : '']"
          type="button"
          :title="tally.label"
          @click="react(item, tally)"
        >
          <span class="reaction__symbol">{{ tally.symbol }}</span>
          <span v-if="tally.count" class="reaction__count">{{ tally.count }}</span>
        </button>
        <button class="vc-chip vc-chip--button" type="button" @click="toggleComments(item)">
          <AppIcon name="comment" :size="13" />
          {{ commentLabel(item) }}
        </button>
      </footer>

      <div v-if="open[item.announcementId]" class="vc-announcement__thread">
        <p v-if="loadingComments[item.announcementId]" class="vc-faint" style="margin: 0">Carregando...</p>
        <div
          v-for="comment in comments[item.announcementId] || []"
          :key="comment.commentId"
          class="vc-announcement__comment"
        >
          <span class="vc-announcement__author"><PersonLink :user-id="comment.authorId" :name="comment.authorName" /></span>
          <!--
            Num aviso da plataforma a conversa mistura equipes, e de qual delas partiu a fala é
            metade do sentido dela. Num aviso da equipe a resposta é sempre a mesma e o chip só
            repetiria o cabeçalho.
          -->
          <span
            v-if="item.scope === 'GENERAL' && comment.tenantName"
            class="vc-chip comment__team"
          >{{ comment.tenantName }}</span>
          <span class="vc-faint">{{ formatWhen(comment.createdAt) }}</span>
          <button
            v-if="comment.canDelete"
            class="vc-btn vc-btn--ghost vc-btn--small vc-btn--icon"
            type="button"
            title="Remover comentário"
            @click="removeComment(item, comment)"
          >
            <AppIcon name="trash" :size="13" />
          </button>
          <p class="vc-announcement__text">{{ comment.content }}</p>
        </div>

        <div class="vc-input-group">
          <input
            class="vc-input"
            type="text"
            :maxlength="COMMENT_LIMIT"
            placeholder="Escreva um comentário"
            v-model="drafts[item.announcementId]"
            @keydown.enter="sendComment(item)"
          />
          <button class="vc-btn" type="button" :disabled="!(drafts[item.announcementId] || '').trim()"
                  @click="sendComment(item)">
            <AppIcon name="send" :size="15" />
            Comentar
          </button>
        </div>
      </div>
    </article>

    <div v-if="board.length < total" class="vc-row" style="justify-content: center">
      <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="loadingMore"
              @click="loadMore">
        <AppIcon name="chevronDown" :size="15" />
        {{ loadingMore ? 'Carregando...' : 'Ver mais' }}
      </button>
      <span class="vc-faint">{{ board.length }} de {{ total }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from './AppIcon.vue';
import PersonLink from '@/components/PersonLink.vue';
import EmptyState from './EmptyState.vue';
import PanelCard from './PanelCard.vue';
import SectionTitle from './SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { announcements as announcementsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The announcement board of the team.
 *
 * One list mixes the three reaches — the platform, the team and the divisions of whoever is
 * reading — because that is how somebody standing in front of it thinks about it: what do I need to
 * know today. Only the chip on each entry says where it came from.
 *
 * The composer never guesses who may publish where: /announcements/scopes answers it. Leading a
 * division opens a reach that no permission names, so `auth.can` alone would either hide the
 * composer from a leader or offer them a division the server would refuse.
 */
const auth = authStore();
const toast = useToast();

/* Same ceiling the server checks, which is the width of the column in a database that already exists. */
const LIMIT = 255;
const COMMENT_LIMIT = 1500;

/* Quantos avisos cada página traz. É o padrão do servidor, escrito aqui para o "Ver mais" saber
   contar as páginas que já pediu. */
const PAGE_SIZE = 20;

const board = ref([]);
const total = ref(0);
const page = ref(0);
const scopes = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const composing = ref(false);
const sending = ref(false);
const draft = reactive({ target: '', title: '', content: '' });
const open = reactive({});
const comments = reactive({});
const drafts = reactive({});
const loadingComments = reactive({});

/** One option can be a scope or a scope plus a division, so the select needs both in its value. */
function optionKey(option) {
  return option.divisionId ? `DIVISION:${option.divisionId}` : option.scope;
}

const scopeHint = computed(() => {
  const chosen = scopes.value.find((option) => optionKey(option) === draft.target);
  if (!chosen) return '';
  if (chosen.scope === 'GENERAL') return 'Vai para todas as equipes da plataforma.';
  if (chosen.scope === 'TENANT') return 'Vai para todos os membros desta equipe.';
  return `Vai para quem está em ${chosen.divisionName} e nas subdivisões dela.`;
});

onMounted(load);
watch(() => auth.activeTenantId, load);

/* Volta para a primeira página: é o que publicar, apagar e trocar de equipe fazem. */
async function load() {
  if (!auth.activeTenantId) return;
  loading.value = true;
  try {
    const [boardResponse, scopesResponse] = await Promise.all([
      announcementsApi.list(auth.activeTenantId, { page: 0, size: PAGE_SIZE }),
      announcementsApi.scopes(auth.activeTenantId),
    ]);
    page.value = 0;
    board.value = boardResponse.data.items;
    total.value = boardResponse.data.totalElements;
    scopes.value = scopesResponse.data;
    if (!draft.target && scopes.value.length) {
      draft.target = optionKey(scopes.value[0]);
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar o mural'));
  } finally {
    loading.value = false;
  }
}

/*
 * A próxima página entra no fim da lista, e não no lugar dela: o mural é lido de cima para baixo, e
 * trocar o que está na tela por outra página faria quem está lendo perder o lugar.
 *
 * O que já está na tela sai da resposta pelo id. Um aviso publicado entre uma página e a seguinte
 * empurra todas as linhas uma casa para baixo, e sem isso a última da página anterior voltaria — com
 * a mesma chave, que o `v-for` recusa.
 */
async function loadMore() {
  if (!auth.activeTenantId || loadingMore.value) return;
  loadingMore.value = true;
  /* De qual equipe esta página foi pedida: trocar de equipe no meio do caminho recarrega o mural, e
     sem isto a página que ainda estava vindo entraria no fim do mural da outra. */
  const asked = auth.activeTenantId;
  try {
    const { data } = await announcementsApi.list(asked, {
      page: page.value + 1,
      size: PAGE_SIZE,
    });
    if (asked !== auth.activeTenantId) return;
    page.value = data.page;
    total.value = data.totalElements;
    const known = new Set(board.value.map((one) => one.announcementId));
    board.value = [...board.value, ...data.items.filter((one) => !known.has(one.announcementId))];
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar mais avisos'));
  } finally {
    loadingMore.value = false;
  }
}

async function publish() {
  const chosen = scopes.value.find((option) => optionKey(option) === draft.target);
  if (!chosen) return;
  sending.value = true;
  try {
    await announcementsApi.create(auth.activeTenantId, {
      title: draft.title,
      content: draft.content,
      scope: chosen.scope,
      divisionId: chosen.divisionId || null,
    });
    draft.title = '';
    draft.content = '';
    composing.value = false;
    await load();
    toast.success('Aviso publicado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao publicar o aviso'));
  } finally {
    sending.value = false;
  }
}

async function remove(item) {
  try {
    await announcementsApi.remove(item.announcementId);
    await load();
    toast.info('Aviso removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o aviso'));
  }
}

/*
 * Reage, ou desfaz reagindo igual de novo.
 *
 * A resposta traz a contagem inteira do aviso, e é ela que entra no lugar da antiga — somar um do lado
 * do cliente erraria toda vez que duas pessoas reagissem quase junto.
 */
async function react(item, tally) {
  try {
    const { data } = await announcementsApi.react(item.announcementId, tally.kind);
    item.reactions = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao reagir'));
  }
}

function commentLabel(item) {
  const count = comments[item.announcementId]?.length ?? item.commentCount ?? 0;
  if (open[item.announcementId]) return 'Fechar comentários';
  if (!count) return 'Comentar';
  return count === 1 ? '1 comentário' : `${count} comentários`;
}

async function toggleComments(item) {
  const id = item.announcementId;
  open[id] = !open[id];
  if (!open[id] || comments[id]) return;
  loadingComments[id] = true;
  try {
    const { data } = await announcementsApi.comments(id);
    comments[id] = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar os comentários'));
    open[id] = false;
  } finally {
    loadingComments[id] = false;
  }
}

async function sendComment(item) {
  const id = item.announcementId;
  const content = (drafts[id] || '').trim();
  if (!content) return;
  try {
    /* A equipe aberta vai no corpo: num aviso da plataforma é ela que diz de onde partiu a fala, e
       é quem modera o comentário depois. */
    const { data } = await announcementsApi.comment(id, { content, tenantId: auth.activeTenantId });
    comments[id] = [...(comments[id] || []), data];
    drafts[id] = '';
    item.commentCount = (item.commentCount || 0) + 1;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao comentar'));
  }
}

async function removeComment(item, comment) {
  try {
    await announcementsApi.removeComment(comment.commentId);
    const id = item.announcementId;
    comments[id] = (comments[id] || []).filter((one) => one.commentId !== comment.commentId);
    item.commentCount = Math.max(0, (item.commentCount || 1) - 1);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o comentário'));
  }
}

/* The chip color says the reach at a glance, without reading the word. */
function scopeChip(scope) {
  if (scope === 'GENERAL') return 'vc-chip--warning';
  if (scope === 'DIVISION') return 'vc-chip--info';
  return 'vc-chip--purple';
}

function formatWhen(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
</script>

<style scoped>
.reaction {
  gap: 4px;
  font-size: 13px;
  line-height: 1;
}

.reaction.is-mine {
  border-color: var(--vc-purple);
  background: var(--vc-purple-soft);
  color: var(--vc-purple-strong);
}

.reaction__symbol { font-size: 14px; }
.reaction__count { font-size: 11px; font-weight: 600; }

/* A equipe de onde partiu a fala fica ao lado do nome, e menor que ele: é contexto, não o assunto. */
.comment__team {
  font-size: 11px;
}
</style>
