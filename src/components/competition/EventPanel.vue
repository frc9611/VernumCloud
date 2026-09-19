<template>
  <div class="vc-stack">
    <SectionTitle :title="event.eventName">
      <template #actions>
        <span v-if="event.happening" class="vc-chip vc-chip--success">acontecendo agora</span>
        <span v-else-if="event.featured" class="vc-chip vc-chip--purple">em destaque</span>
        <span v-if="dates" class="vc-chip">{{ dates }}</span>
        <span v-if="event.location" class="vc-chip">{{ event.location }}</span>
        <span v-if="standing" class="vc-chip">{{ standing }}</span>
      </template>
    </SectionTitle>

    <div v-if="event.matches && event.matches.length" class="vc-card">
      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Partida</th>
              <th>Horário</th>
              <th v-if="hasVenue">Local</th>
              <th v-if="hasAlliances">Aliança</th>
              <th>{{ hasAlliances ? 'Placar' : 'Pontos' }}</th>
              <th v-if="hasAlliances">Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="match in ordered" :key="match.matchKey">
              <td>{{ match.displayName || match.matchKey }}</td>
              <td>{{ match.scheduledAt ? formatTime(match.scheduledAt) : '—' }}</td>
              <td v-if="hasVenue">{{ match.venueLabel || '—' }}</td>
              <td v-if="hasAlliances">{{ sideLabel(match.ourAlliance) }}</td>
              <td :class="match.played ? 'score' : 'vc-faint'">{{ scoreOf(match) }}</td>
              <td v-if="hasAlliances" :class="resultClass(match.result)">{{ resultWord(match) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <EmptyState v-else title="Ainda não há partidas">
      Assim que a grade do evento sair, ela aparece aqui sozinha.
    </EmptyState>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { formatDate, formatTime } from '@/services/time.js';

/*
 * Um evento como a aba o mostra: o que a equipe jogou e o que ela vai jogar.
 *
 * As colunas de aliança e de local só existem quando o evento tem as duas coisas. Uma coluna
 * "Aliança" cheia de travessões numa liga que não tem aliança não informa nada e ainda ocupa a
 * largura que o nome da partida precisa num celular.
 */
const props = defineProps({
  event: { type: Object, required: true },
});

const SIDES = { RED: 'Vermelha', BLUE: 'Azul' };

const hasAlliances = computed(() => (props.event.matches || []).some((match) => match.ourAlliance));
const hasVenue = computed(() => (props.event.matches || []).some((match) => match.venueLabel));

/* A que vem primeiro no topo, e as jogadas descendo: é a ordem em que a pergunta é feita. */
const ordered = computed(() => {
  const matches = [...(props.event.matches || [])];
  const pending = matches.filter((match) => !match.played);
  const played = matches.filter((match) => match.played);
  const byTime = (a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || ''));
  pending.sort(byTime);
  played.sort((a, b) => byTime(b, a));
  return [...pending, ...played];
});

const dates = computed(() => {
  if (!props.event.startsAt) return '';
  const start = formatDate(props.event.startsAt);
  if (!props.event.endsAt || props.event.endsAt === props.event.startsAt) return start;
  return `${start} a ${formatDate(props.event.endsAt)}`;
});

const standing = computed(() => {
  const row = props.event.standing;
  if (!row) return '';
  const parts = [];
  if (row.rankPosition) parts.push(`${row.rankPosition}º lugar`);
  if (row.wins != null) parts.push(`${row.wins}V ${row.losses ?? 0}D`);
  return parts.join(' · ');
});

function sideLabel(side) {
  return SIDES[side] || '—';
}

function scoreOf(match) {
  if (!match.played) return 'a jogar';
  if (match.theirScore == null) return match.ourScore ?? '—';
  return `${match.ourScore ?? '—'} × ${match.theirScore ?? '—'}`;
}

function resultWord(match) {
  if (!match.played) return '—';
  if (match.result === 'WIN') return 'vitória';
  if (match.result === 'LOSS') return 'derrota';
  if (match.result === 'TIE') return 'empate';
  return '—';
}

function resultClass(result) {
  if (result === 'WIN') return 'score score--win';
  if (result === 'LOSS') return 'score score--loss';
  return '';
}
</script>

<style scoped>
.score {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.score--win {
  color: var(--vc-success-text);
}

.score--loss {
  color: var(--vc-danger-text);
}
</style>
