<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Calendário</h1>
        <div class="vc-row" style="gap: 6px; align-items: center">
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="move(-1)">←</button>
          <strong class="cal__month">{{ monthLabel }}</strong>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="move(1)">→</button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="today">Hoje</button>
        </div>
      </div>

      <p class="vc-muted" style="margin: 0">
        Reuniões, viagens, eventos, prazos de demanda e janelas de inscrição de todas as suas equipes,
        num lugar só. Só aparece aqui o que você já veria na tela de origem.
      </p>

      <div class="cal__filters">
        <div class="vc-row cal__legend">
          <label v-for="kind in kinds" :key="kind.key" class="cal__key">
            <input type="checkbox" v-model="shown" :value="kind.key" />
            <span class="cal__dot" :style="{ background: kind.color }"></span>
            {{ kind.label }}
          </label>
        </div>

        <!--
          Só aparece com mais de uma equipe no período. Para quem está em uma — que é quase todo mundo
          — este filtro seria uma caixinha que nunca muda nada, e a tela continua exatamente tão calma
          quanto era quando o calendário ainda era de uma equipe só. O quadradinho distingue a cor da
          equipe da cor da origem, que é redonda logo ao lado.
        -->
        <div v-if="teams.length > 1" class="vc-row cal__legend">
          <span class="vc-faint">Equipes</span>
          <label v-for="team in teams" :key="team.tenantId" class="cal__key">
            <input type="checkbox" :checked="!hiddenTeams.includes(team.tenantId)"
                   @change="toggleTeam(team.tenantId)" />
            <span class="cal__swatch" :style="{ background: team.color || 'var(--vc-purple)' }"></span>
            {{ team.name }}
          </label>
        </div>

        <label class="cal__key cal__mine-toggle">
          <input type="checkbox" v-model="onlyMine" />
          <AppIcon name="userCheck" :size="13" />
          Só o que é meu
        </label>
      </div>

      <!-- A marca só é explicada quando existe algo marcado, mesma regra que a legenda segue com as cores -->
      <p v-if="anyMine" class="vc-faint cal__note">
        Marcado é o que é seu: demanda atribuída a você, reunião para a qual foi chamado, viagem para a
        qual foi convidado. O resto também é seu de ver — é da equipe inteira, ou de uma divisão sua.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <template v-else>
        <!-- A grade do mês: semanas de segunda a domingo, que é como a equipe pensa a semana -->
        <div class="cal__grid" role="grid">
          <div v-for="name in weekdays" :key="name" class="cal__weekday">{{ name }}</div>
          <div v-for="cell in cells" :key="cell.key"
               :class="['cal__cell', cell.other ? 'is-other' : '', cell.today ? 'is-today' : '']">
            <span class="cal__day">{{ cell.day }}</span>
            <button v-for="item in cell.items" :key="item.kind + item.id"
                    :class="['cal__item', item.mine ? 'is-mine' : '']"
                    :title="itemTitle(item)" @click="go(item)">
              <span class="cal__dot" :style="{ background: item.color }"></span>
              <!-- Concatenado e não dois nós: o Vue come o espaço entre a interpolação e o texto -->
              <span class="cal__text" :class="item.done ? 'is-done' : ''">
                {{ item.allDay ? item.title : formatTime(item.startsAt) + ' ' + item.title }}
              </span>
            </button>
          </div>
        </div>

        <!-- A lista embaixo: num mês cheio, a grade mostra que tem algo e a lista diz o quê -->
        <section class="vc-stack">
          <SectionTitle title="No período" />
          <EmptyState v-if="!visible.length" title="Nada marcado neste mês">
            <!--
              Filtrar até não sobrar nada é diferente de não haver nada, e quem acabou de marcar
              "Só o que é meu" precisa saber que a tela está vazia por causa disso.
            -->
            <template v-if="onlyMine && items.length">
              Não há nada ligado diretamente a você neste mês. Desmarque "Só o que é meu" para ver o
              que é da equipe.
            </template>
            <template v-else>
              Reuniões, viagens, eventos e prazos aparecem aqui assim que existirem.
            </template>
          </EmptyState>
          <ul v-else class="cal__list">
            <li v-for="item in visible" :key="item.kind + item.id"
                :class="item.mine ? 'is-mine' : ''" @click="go(item)">
              <span class="cal__dot" :style="{ background: item.color }"></span>
              <span class="cal__when">
                {{ formatDate(item.startsAt) }}
                <span v-if="!item.allDay" class="vc-faint">{{ formatTime(item.startsAt) }}</span>
              </span>
              <span class="cal__grow" :class="item.done ? 'is-done' : ''">{{ item.title }}</span>
              <span v-if="item.mine" class="cal__mine-mark" title="É seu">
                <AppIcon name="userCheck" :size="13" />
              </span>
              <span class="vc-chip">{{ item.kindLabel }}</span>
              <!-- A equipe só entra quando há mais de uma: com uma só, o chip repetiria a mesma palavra
                   em toda linha da lista -->
              <span v-if="teams.length > 1" class="vc-chip cal__team"
                    :style="{ '--team-color': item.tenantColor || 'var(--vc-purple)' }">
                {{ item.tenantName }}
              </span>
              <span v-if="item.divisionName" class="vc-faint">{{ item.divisionName }}</span>
              <span v-if="item.detail" class="vc-faint">{{ item.detail }}</span>
            </li>
          </ul>
        </section>
      </template>

      <!--
        A assinatura .ics fica no fim da tela de propósito: é coisa que se configura uma vez e nunca
        mais se olha, e quem abriu o calendário veio ver o mês.
      -->
      <PanelCard title="Assinar no seu calendário" icon="calendar" muted>
        <p v-if="feedLoading" class="vc-faint" style="margin: 0">Carregando...</p>

        <div v-else-if="!feed" class="vc-faint">
          Não deu para carregar a assinatura agora. Recarregue a página para tentar de novo.
        </div>

        <div v-else-if="!feed.enabled" class="cal__feed">
          <p class="vc-muted" style="margin: 0">
            O Google Agenda, o Calendário do iPhone e o Outlook sabem ler um endereço e mostrar tudo
            isto junto com o resto da sua vida, sozinhos, sem você abrir o painel. O endereço só passa
            a existir quando você pedir.
          </p>
          <div class="vc-row">
            <button class="vc-btn" type="button" :disabled="feedBusy" @click="generate(false)">
              Gerar o link
            </button>
          </div>
        </div>

        <div v-else class="cal__feed">
          <div class="vc-field">
            <label class="vc-label" for="cal-feed">Endereço da assinatura</label>
            <div class="vc-input-group">
              <input id="cal-feed" class="vc-input" type="text" readonly :value="feedUrl" />
              <button class="vc-btn vc-btn--icon" type="button" aria-label="Copiar endereço"
                      title="Copiar endereço" @click="copy(feedUrl)">
                <AppIcon name="copy" :size="16" />
              </button>
            </div>
            <p class="vc-faint cal__hint">
              Cole em "Adicionar por URL" no Google Agenda, ou em "Nova assinatura de calendário" no
              iPhone. Eles releem o endereço no ritmo deles, então uma reunião marcada agora pode
              levar horas para aparecer lá — quem precisa do horário na hora abre esta tela.
            </p>
          </div>

          <AlertBanner variant="warning" title="O endereço é um segredo.">
            Quem tiver o link lê a sua agenda inteira — o que você tem marcado, onde e quando — sem
            conta e sem senha, de qualquer lugar. Não mande num grupo e não publique em lugar nenhum.
          </AlertBanner>

          <label class="vc-checkbox">
            <input type="checkbox" :checked="feed.onlyMine" :disabled="feedBusy"
                   @change="setOnlyMine($event.target.checked)" />
            <span>
              <strong>Levar só o que é meu</strong>
              <span class="vc-faint">
                — vai só a demanda atribuída a você, a reunião para a qual foi chamado e a viagem para
                a qual foi convidado. O que é da equipe inteira fica fora do arquivo.
              </span>
            </span>
          </label>

          <!--
            A única pista que existe de que o endereço vazou: ninguém pede login para lê-lo, então uma
            leitura numa hora em que a pessoa não assinou nada é o que dá para notar.
          -->
          <p v-if="feed.lastPolledAt" class="vc-faint cal__hint">
            Lido pela última vez em {{ formatDateTime(feed.lastPolledAt) }}.
          </p>

          <div class="vc-row cal__feed-actions">
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="feedBusy"
                    @click="generate(true)">
              Gerar link novo
            </button>
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="feedBusy"
                    @click="turnOff">
              Desligar a assinatura
            </button>
            <span class="vc-spacer"></span>
            <span class="vc-faint cal__hint">o endereço de agora para de valer na hora</span>
          </div>
        </div>
      </PanelCard>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { calendar } from '@/services/api.js';
import http, { apiMessage } from '@/services/http.js';
import { formatDate, formatDateTime, formatTime, parseServer } from '@/services/time.js';

/*
 * O calendário da pessoa.
 *
 * Ele é da pessoa e não da equipe: uma chamada só traz o que ela tem em todas as equipes dela de uma
 * vez, e por isso a tela não pede equipe aberta e funciona para quem não tem nenhuma. O servidor já
 * corta cada origem pela permissão dela dentro de cada equipe, então esta tela não decide nada sobre
 * acesso: ela desenha o que veio. Os filtros de cima são preferência de leitura e nada mais —
 * desmarcar "Prazos", ou uma equipe, esconde da tela e não muda o que a pessoa pode ver.
 */
const auth = authStore();
const router = useRouter();
const toast = useToast();

const KINDS = [
  { key: 'MEETING', label: 'Reuniões', color: '#8864AE' },
  { key: 'TRIP', label: 'Viagens', color: '#2f80ed' },
  { key: 'EVENT', label: 'Eventos', color: '#e2a03f' },
  { key: 'TASK', label: 'Prazos', color: '#6b6b76' },
  { key: 'RECRUITMENT', label: 'Processos', color: '#2e9e5b' },
];

const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const items = ref([]);
const loading = ref(true);
const cursor = ref(startOfMonth(new Date()));
const shown = ref(KINDS.map((k) => k.key));
const onlyMine = ref(false);

/*
 * Guarda quem foi desmarcado, e não quem está marcado. A lista de equipes vem do que o mês carregou,
 * então uma equipe que só marca alguma coisa em novembro precisa chegar marcada em novembro; com a
 * lista do contrário ela chegaria escondida sem ninguém a ter escondido.
 */
const hiddenTeams = ref([]);

const feed = ref(null);
const feedLoading = ref(true);
const feedBusy = ref(false);

/* Só oferece o filtro do que existe no período: uma legenda de cinco cores num mês com reuniões só. */
const kinds = computed(() => {
  const present = new Set(items.value.map((i) => i.kind));
  return KINDS.filter((k) => present.has(k.key));
});

/* Mesma regra da legenda, aplicada às equipes: quem só tem uma equipe no mês não ganha filtro nenhum. */
const teams = computed(() => {
  const byId = new Map();
  for (const item of items.value) {
    if (!byId.has(item.tenantId)) {
      byId.set(item.tenantId, {
        tenantId: item.tenantId,
        name: item.tenantName,
        color: item.tenantColor || null,
      });
    }
  }
  return [...byId.values()].sort((one, other) => one.name.localeCompare(other.name, 'pt-BR'));
});

const anyMine = computed(() => items.value.some((item) => item.mine));

const visible = computed(() => items.value.filter((item) => (
  shown.value.includes(item.kind)
  && !hiddenTeams.value.includes(item.tenantId)
  && (!onlyMine.value || item.mine)
)));

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

/*
 * Absoluto contra a API, nunca contra o painel: quem lê este endereço é o Google, não o navegador de
 * quem está aqui, e o painel pode estar num domínio que nem responde /public. O servidor manda o
 * caminho relativo justamente porque só o painel sabe onde a API dele atende — mesmo caminho que
 * api.js faz para a foto de perfil.
 */
const feedUrl = computed(() => (feed.value?.path ? http.defaults.baseURL + feed.value.path : ''));

const cells = computed(() => {
  const first = startOfMonth(cursor.value);
  const offset = (first.getDay() + 6) % 7; //segunda = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const now = new Date();
  const out = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    out.push({
      key: day.toISOString().slice(0, 10),
      day: day.getDate(),
      other: day.getMonth() !== first.getMonth(),
      today: sameDay(day, now),
      items: visible.value.filter((item) => covers(item, day)),
    });
  }
  //Corta a última semana quando ela é inteira do mês seguinte
  return out.slice(0, out.slice(35).every((c) => c.other) ? 35 : 42);
});

onMounted(() => {
  load();
  loadFeed();
});

//Só o mês: a equipe aberta não entra mais na conta, e trocar de equipe não tem o que recarregar aqui
watch([cursor], load);

async function load() {
  loading.value = true;
  try {
    const first = startOfMonth(cursor.value);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    //A janela pega a semana inteira nas duas pontas, senão a grade mostra células vazias que não são
    const from = new Date(first);
    from.setDate(first.getDate() - 7);
    const to = new Date(last);
    to.setDate(last.getDate() + 7);
    const { data } = await calendar.mine(iso(from), iso(to));
    items.value = data;
  } catch (error) {
    items.value = [];
    toast.error(apiMessage(error, 'Não deu para carregar o calendário.'));
  } finally {
    loading.value = false;
  }
}

function move(months) {
  const next = new Date(cursor.value);
  next.setMonth(next.getMonth() + months);
  cursor.value = startOfMonth(next);
}

function today() {
  cursor.value = startOfMonth(new Date());
}

function toggleTeam(tenantId) {
  const at = hiddenTeams.value.indexOf(tenantId);
  if (at >= 0) {
    hiddenTeams.value.splice(at, 1);
  } else {
    hiddenTeams.value.push(tenantId);
  }
}

/* Um item de vários dias aparece em todos eles, que é o que "a viagem é de 12 a 15" quer dizer. */
function covers(item, day) {
  const start = parseServer(item.startsAt);
  const end = parseServer(item.endsAt) || start;
  if (!start) return false;
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= a && d <= b;
}

function go(item) {
  /*
   * A tela mistura equipes e toda tela de destino olha a equipe aberta: sem trocar antes, o clique
   * cairia na tela certa da equipe errada — ou na guarda de permissão dela. É o mesmo passo que o
   * sino das notificações dá no AppHeader antes de seguir o link de um aviso de outra equipe.
   */
  if (item.tenantId && item.tenantId !== auth.activeTenantId && auth.membershipOn(item.tenantId)) {
    auth.setActiveTenant(item.tenantId);
  }
  if (item.kind === 'MEETING') {
    router.push({ name: 'meeting', params: { meetingId: item.routeId } });
    return;
  }
  //As outras telas não abrem um item por id, então o calendário leva até a tela e para por ali
  const routes = { TRIP: 'trips', EVENT: 'adminEvents', TASK: 'tasks', RECRUITMENT: 'adminRecruitment' };
  const name = routes[item.kind];
  if (!name) return;
  //A rota pode ser recusada pela guarda de permissão da tela de destino, e aí não há o que fazer:
  //o item aparece no calendário porque a origem deixou, não porque a tela dela esteja aberta.
  router.push({ name }).catch((refused) => toast.info('Você não tem acesso à tela dessa origem.'));
}

/* Na grade não cabe o nome da equipe ao lado do título, então ele vive aqui — e a marca do que é seu
   junto, porque a barrinha da borda diz que existe algo mas não diz o quê. */
function itemTitle(item) {
  const parts = [item.kindLabel, item.title];
  if (item.detail) parts.push(item.detail);
  if (teams.value.length > 1 && item.tenantName) parts.push(item.tenantName);
  if (item.mine) parts.push('é seu');
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ assinatura */

async function loadFeed() {
  feedLoading.value = true;
  try {
    const { data } = await calendar.feed();
    feed.value = data;
  } catch (error) {
    //Sem toast: quem abriu a tela veio ver o mês, e o mês carregou
    feed.value = null;
  } finally {
    feedLoading.value = false;
  }
}

/*
 * Criar o endereço e trocar o endereço são a mesma rota, porque do lado do servidor são a mesma
 * coisa: um token novo, e a assinatura ligada. A diferença está aqui — quem já tem um endereço no ar
 * é avisado antes, já que o calendário que assinou o antigo não recebe aviso nenhum: ele
 * simplesmente para de atualizar e a pessoa descobre pela agenda que envelheceu.
 */
async function generate(rotating) {
  if (rotating && !window.confirm('Gerar um endereço novo? Todo calendário que já assina o atual para de atualizar na hora, sem aviso, e precisa assinar o novo.')) {
    return;
  }
  feedBusy.value = true;
  try {
    const { data } = await calendar.rotateFeed();
    feed.value = data;
    toast.success(rotating
      ? 'Endereço novo gerado. Assine-o de novo onde você lê a sua agenda.'
      : 'Pronto. Copie o endereço e cole no seu calendário.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao gerar o endereço'));
  } finally {
    feedBusy.value = false;
  }
}

async function setOnlyMine(value) {
  feedBusy.value = true;
  try {
    const { data } = await calendar.saveFeed({ onlyMine: value });
    feed.value = data;
  } catch (error) {
    /*
     * O navegador já virou a caixinha sozinho, e `feed` não mudou — então o Vue não teria por que
     * redesenhar e a tela ficaria mostrando um estado que o servidor não guardou. Trocar o objeto
     * força o redesenho e devolve a caixinha ao que está salvo de verdade.
     */
    feed.value = { ...feed.value };
    toast.error(apiMessage(error, 'Erro ao salvar a assinatura'));
  } finally {
    feedBusy.value = false;
  }
}

async function turnOff() {
  if (!window.confirm('Desligar a assinatura? O endereço para de responder na hora, e ligar de novo dá um endereço diferente — os calendários que já assinaram este não voltam sozinhos.')) {
    return;
  }
  feedBusy.value = true;
  try {
    const { data } = await calendar.saveFeed({ enabled: false });
    feed.value = data;
    toast.info('Assinatura desligada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao desligar a assinatura'));
  } finally {
    feedBusy.value = false;
  }
}

async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Endereço copiado!');
  } catch (error) {
    toast.warning('Não deu para copiar. Selecione o endereço e copie manualmente.');
  }
}

/* --------------------------------------------------------------------- datas */

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
</script>

<style scoped>
/* Só a primeira letra: `capitalize` inteiro escreve "Setembro De 2026".
   `inline-block` é necessário — ::first-letter não pega num elemento inline. */
.cal__month { display: inline-block; min-width: 150px; text-align: center; }
.cal__month::first-letter { text-transform: uppercase; }

/* Os três grupos de filtro numa linha só enquanto couberem, e cada um quebra inteiro quando não cabe */
.cal__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.cal__legend { flex-wrap: wrap; gap: 12px; }

.cal__key {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.cal__mine-toggle { color: var(--vc-purple-strong); }

.cal__note { margin: 0; }

.cal__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Quadrado e não redondo: a cor da equipe e a cor da origem estão lado a lado e não podem se confundir */
.cal__swatch {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 1px;
  background: var(--vc-border);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
  overflow: hidden;
}

.cal__weekday {
  padding: 7px;
  background: var(--vc-surface-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-text-muted);
  text-align: center;
}

.cal__cell {
  min-height: 92px;
  padding: 5px;
  background: var(--vc-surface);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cal__cell.is-other { background: var(--vc-surface-muted); }
.cal__cell.is-other .cal__day { opacity: 0.45; }

.cal__cell.is-today .cal__day {
  background: var(--vc-purple);
  color: var(--vc-on-accent);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal__day { font-size: 11px; color: var(--vc-text-muted); }

.cal__item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.cal__item:hover { background: var(--vc-surface-muted); }

.cal__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-done { text-decoration: line-through; opacity: 0.6; }

/* A marca do que é seu: uma barra fina na borda esquerda, desenhada com box-shadow para não mexer na
   largura de nada nem disputar com a bolinha da origem, que é a cor do item. É um token do tema, e
   por isso existe igual no claro e no escuro. */
.cal__item.is-mine,
.cal__list li.is-mine {
  box-shadow: inset 2px 0 0 var(--vc-purple);
}

.cal__item.is-mine { padding-left: 7px; }
.cal__list li.is-mine { padding-left: 8px; }

.cal__mine-mark {
  flex: none;
  display: inline-flex;
  color: var(--vc-purple);
}

/* A cor da equipe entra diluída: o hex vem do servidor e não é legível como fundo sozinho, muito
   menos nos dois temas ao mesmo tempo. */
.cal__team {
  border-color: color-mix(in srgb, var(--team-color) 45%, var(--vc-border));
  background: color-mix(in srgb, var(--team-color) 14%, var(--vc-surface));
  color: var(--vc-text);
}

.cal__list { list-style: none; margin: 0; padding: 0; }

.cal__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--vc-border);
  cursor: pointer;
}

.cal__when { min-width: 128px; }

.cal__grow { flex: 1; min-width: 0; }

/* O corpo do cartão da assinatura: mais apertado que o .vc-stack da página, que é feito para seções */
.cal__feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cal__feed-actions { flex-wrap: wrap; gap: 8px; }

.cal__hint { margin: 4px 0 0; font-size: 0.76rem; }

/*
 * No telefone a linha da lista quebra. Ela sempre foi uma linha só — data, título, origem, divisão e
 * detalhe lado a lado —, e cabia enquanto o calendário era de uma equipe; o chip da equipe é a coluna
 * que a fez passar da tela, e uma lista que rola para o lado esconde justamente o fim dela, que é onde
 * está o lugar da reunião. Quebrando, o título fica com a largura inteira e o resto desce para baixo
 * dele, na ordem em que já estava.
 */
@media (max-width: 640px) {
  .cal__list li { flex-wrap: wrap; }
  .cal__grow { flex-basis: 100%; }
  .cal__when { min-width: 0; }
}
</style>
