<template>
  <main class="vc-page">
    <h1 class="vc-title vc-title--underlined">Competição</h1>

    <AlertBanner v-if="error" variant="danger" title="Não deu certo">{{ error }}</AlertBanner>

    <div class="vc-stack">
      <!-- ------------------------------------------------------------- em cartaz -->
      <SectionTitle title="Em cartaz">
        <template #actions>
          <span v-if="showing.length" class="vc-chip vc-chip--success">{{ showing.length }}</span>
        </template>
      </SectionTitle>

      <div v-for="event in showing" :key="event.linkId" class="vc-card">
        <div class="vc-card__header">
          {{ event.eventName }}
          <span class="vc-card__icon">{{ event.providerLabel }}</span>
        </div>
        <div class="vc-card__body">
          <div class="vc-row">
            <span v-if="event.happening" class="vc-chip vc-chip--success">acontecendo agora</span>
            <span v-else-if="event.featured" class="vc-chip vc-chip--purple">em destaque</span>
            <span v-if="datesOf(event)" class="vc-chip">{{ datesOf(event) }}</span>
            <span v-if="event.location" class="vc-chip">{{ event.location }}</span>
            <span v-if="standingOf(event)" class="vc-chip">{{ standingOf(event) }}</span>
          </div>
          <div v-if="canManage" class="vc-row">
            <button class="vc-btn vc-btn--outline vc-btn--small" type="button"
                    :disabled="busy" @click="feature(event, !event.featured)">
              {{ event.featured ? 'Tirar do destaque' : 'Pôr em destaque' }}
            </button>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                    :disabled="busy" @click="unlink(event)">Desvincular</button>
          </div>
        </div>
      </div>

      <EmptyState v-if="!showing.length" title="Nada em cartaz agora">
        Um evento aparece aqui enquanto acontece, quando já tem cronograma, ou se alguém o puser em
        destaque.
      </EmptyState>

      <!-- ------------------------------------------------------------- sugestões -->
      <template v-if="canManage">
        <SectionTitle :title="suggestionTitle">
          <template #actions>
            <input class="vc-input season" type="number" v-model="season" min="2000" max="2100"
                   aria-label="Temporada" @change="loadSuggestions" />
            <button class="vc-btn vc-btn--small" type="button" :disabled="busy"
                    @click="loadSuggestions">Procurar</button>
          </template>
        </SectionTitle>

        <div class="vc-card">
          <div class="vc-card__body">
            <p v-if="loadingSuggestions" class="vc-faint">Procurando...</p>
            <p v-else-if="!suggestions.length" class="vc-faint">
              Nenhum evento com o número desta equipe nesta temporada.
            </p>
            <div v-for="candidate in suggestions" :key="candidate.externalEventKey" class="sug">
              <span>
                <span class="sug__name">{{ candidate.eventName }}</span><br>
                <span class="sug__meta">{{ metaOf(candidate) }}</span>
              </span>
              <span class="vc-spacer"></span>
              <span v-if="candidate.alreadyLinked" class="vc-chip vc-chip--success">vinculado</span>
              <span v-else-if="candidate.takenByOtherTeam" class="vc-chip vc-chip--warning">
                de outra equipe
              </span>
              <button v-else class="vc-btn vc-btn--small" type="button" :disabled="busy"
                      @click="link(candidate)">Vincular</button>
            </div>
          </div>
        </div>
      </template>

      <!-- -------------------------------------------------------------- histórico -->
      <SectionTitle title="Histórico" />
      <div class="vc-card">
        <div class="vc-card__body history">
          <p v-if="!history.length" class="vc-faint">
            Nenhuma competição registrada ainda.
          </p>
          <template v-for="group in byYear" :key="group.season">
            <p class="year">{{ group.season }}</p>
            <div v-for="event in group.events" :key="event.linkId" class="sug">
              <span>
                <span class="sug__name">{{ event.eventName }}</span><br>
                <span class="sug__meta">{{ historyMetaOf(event) }}</span>
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import AlertBanner from '@/components/AlertBanner.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { competition as competitionApi } from '@/services/api.js';
import { formatDate } from '@/services/time.js';

/*
 * A tela da competição, a única que existe o ano todo — a aba na tela principal só aparece enquanto
 * há algo em cartaz, e é aqui que se resolve o que ainda não está.
 *
 * "Procurar" é o único botão desta tela que faz o servidor sair para a internet, e por isso ele é um
 * botão e não um carregamento automático: quem aperta é uma pessoa, algumas vezes por temporada.
 */
const auth = authStore();

const showing = ref([]);
const history = ref([]);
const suggestions = ref([]);
const season = ref(new Date().getFullYear());
const loadingSuggestions = ref(false);
const busy = ref(false);
const error = ref('');

const canManage = computed(() => auth.can('COMPETITION_MANAGE'));

const suggestionTitle = computed(() =>
  `Eventos com o número ${auth.activeTenant?.teamNumber || 'da equipe'}`);

/* Uma linha por ano, com o ano como cabeçalho de grupo em vez de um cartão por temporada. */
const byYear = computed(() => {
  const groups = new Map();
  for (const event of history.value) {
    const year = event.season || 0;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(event);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, events]) => ({ season: year, events }));
});

onMounted(load);

async function load() {
  try {
    const [now, all] = await Promise.all([
      competitionApi.showing(auth.activeTenantId),
      competitionApi.links(auth.activeTenantId),
    ]);
    showing.value = now.data.events || [];
    history.value = all.data || [];
  } catch (failure) {
    showing.value = [];
    history.value = [];
    error.value = messageOf(failure);
  }
}

async function loadSuggestions() {
  loadingSuggestions.value = true;
  error.value = '';
  try {
    const { data } = await competitionApi.suggestions(auth.activeTenantId, season.value);
    suggestions.value = data || [];
  } catch (failure) {
    suggestions.value = [];
    error.value = messageOf(failure);
  } finally {
    loadingSuggestions.value = false;
  }
}

async function link(candidate) {
  busy.value = true;
  error.value = '';
  try {
    await competitionApi.link(auth.activeTenantId, {
      provider: candidate.provider,
      teamNumber: candidate.teamNumber,
      season: candidate.season,
      externalEventKey: candidate.externalEventKey,
    });
    await Promise.all([load(), loadSuggestions()]);
  } catch (failure) {
    error.value = messageOf(failure);
  } finally {
    busy.value = false;
  }
}

async function feature(event, on) {
  busy.value = true;
  try {
    await competitionApi.update(auth.activeTenantId, event.linkId, { featured: on });
    await load();
  } catch (failure) {
    error.value = messageOf(failure);
  } finally {
    busy.value = false;
  }
}

async function unlink(event) {
  busy.value = true;
  try {
    await competitionApi.unlink(auth.activeTenantId, event.linkId);
    await Promise.all([load(), canManage.value ? loadSuggestions() : Promise.resolve()]);
  } catch (failure) {
    error.value = messageOf(failure);
  } finally {
    busy.value = false;
  }
}

function datesOf(event) {
  if (!event.startsAt) return '';
  const start = formatDate(event.startsAt);
  if (!event.endsAt || event.endsAt === event.startsAt) return start;
  return `${start} a ${formatDate(event.endsAt)}`;
}

function standingOf(event) {
  const row = event.standing;
  if (!row) return '';
  const parts = [];
  if (row.rankPosition) parts.push(`${row.rankPosition}º lugar`);
  if (row.wins != null) parts.push(`${row.wins}V ${row.losses ?? 0}D`);
  return parts.join(' · ');
}

function metaOf(candidate) {
  return [candidate.providerLabel, datesOf(candidate), candidate.location, candidate.formatLabel]
    .filter(Boolean)
    .join(' · ');
}

function historyMetaOf(event) {
  return [event.providerLabel, datesOf(event), event.location, standingOf(event)]
    .filter(Boolean)
    .join(' · ');
}

/* A mensagem do servidor é em português e é ela que o usuário deve ler, não um código HTTP. */
function messageOf(failure) {
  return failure?.response?.data?.message || 'Não foi possível falar com o servidor.';
}
</script>

<style scoped>
.sug {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--vc-border);
}

.sug:last-child {
  border-bottom: none;
}

.sug__name {
  font-weight: 600;
}

.sug__meta {
  color: var(--vc-text-muted);
  font-size: 0.85rem;
}

.history {
  gap: 0;
}

.year {
  margin: 18px 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vc-text-faint);
}

.history .year:first-child {
  margin-top: 0;
}

.season {
  width: 92px;
}
</style>
