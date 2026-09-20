<template>
  <div class="vc-card">
    <div class="vc-card__header">
      Próxima partida
      <span v-if="where" class="vc-card__icon">{{ where }}</span>
    </div>
    <div class="vc-card__body">
      <div class="next">
        <p class="next__when">
          {{ countdown }}
          <small>{{ subtitle }}</small>
        </p>
        <span v-if="queueWord" class="vc-chip vc-chip--purple queue">{{ queueWord }}</span>

        <!-- Liga sem aliança (uma rodada de FLL é uma mesa e um placar): não há lados a desenhar -->
        <div v-if="match.ourAlliance" class="alliance">
          <div :class="['side', sideClass(match.ourAlliance), 'is-ours']">
            <span class="side__label">{{ sideLabel(match.ourAlliance) }}</span>
            <span class="side__teams">
              <span class="team is-us">{{ teamNumber }}</span>
              <span v-for="partner in match.partners" :key="partner" class="team">{{ partner }}</span>
            </span>
          </div>
          <div v-if="match.opponents && match.opponents.length"
               :class="['side', sideClass(otherSide)]">
            <span class="side__label">{{ sideLabel(otherSide) }}</span>
            <span class="side__teams">
              <span v-for="rival in match.opponents" :key="rival" class="team">{{ rival }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { formatTime } from '@/services/time.js';

/*
 * A próxima partida, que é a pergunta mais feita no dia do torneio.
 *
 * O relógio corre aqui e não vem pronto do servidor: a resposta é lida a cada poucos minutos e a
 * contagem tem que andar entre uma leitura e outra, senão "em 18 min" fica dezoito minutos parado
 * na tela enquanto a partida começa.
 */
const props = defineProps({
  match: { type: Object, required: true },
  live: { type: Object, default: null },
  teamNumber: { type: [String, Number], default: '' },
  eventName: { type: String, default: '' },
  showEvent: { type: Boolean, default: false },
});

const SIDES = { RED: 'Vermelha', BLUE: 'Azul' };

/* Estado de fila envelhece: passada esta janela ele não descreve mais o presente. */
const QUEUE_FRESH_MS = 15 * 60 * 1000;

const QUEUE_WORDS = {
  'now queuing': 'chamando agora',
  'on deck': 'na fila',
  'on field': 'em campo',
};

const now = ref(Date.now());
const tick = setInterval(() => (now.value = Date.now()), 1000);
onUnmounted(() => clearInterval(tick));

/** O que o pessoal do evento está dizendo, quando é recente o bastante para ser o presente. */
const queueWord = computed(() => {
  const live = props.live;
  if (!live || !live.ourStatus || !live.asOf) return '';
  if (now.value - new Date(live.asOf).getTime() > QUEUE_FRESH_MS) return '';
  return QUEUE_WORDS[live.ourStatus.toLowerCase()] || '';
});

const otherSide = computed(() => (props.match.ourAlliance === 'RED' ? 'BLUE' : 'RED'));

function sideLabel(side) {
  return SIDES[side] || '';
}

function sideClass(side) {
  return side === 'RED' ? 'side--red' : 'side--blue';
}

/** "Mesa 2", e o nome do evento junto quando há mais de uma competição acontecendo. */
const where = computed(() => {
  const parts = [];
  if (props.showEvent && props.eventName) parts.push(props.eventName);
  if (props.match.venueLabel) parts.push(props.match.venueLabel);
  return parts.join(' · ');
});

const startsAt = computed(() => (props.match.scheduledAt ? new Date(props.match.scheduledAt) : null));

/**
 * Quanto falta, em palavras.
 *
 * Uma partida já jogada mostra o placar em vez de uma contagem negativa, e uma partida sem horário
 * — que existe: nem toda liga publica a grade com hora — diz que não tem horário em vez de mentir
 * um número.
 */
const countdown = computed(() => {
  if (props.match.played) {
    return `${props.match.ourScore ?? '—'} × ${props.match.theirScore ?? '—'}`;
  }
  if (!startsAt.value) return 'sem horário';
  const seconds = Math.round((startsAt.value.getTime() - now.value) / 1000);
  if (seconds <= 0) return 'agora';
  if (seconds < 60) return `em ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours} h ${rest} min` : `em ${hours} h`;
});

const subtitle = computed(() => {
  const parts = [];
  if (props.match.displayName) parts.push(props.match.displayName);
  if (startsAt.value) parts.push(formatTime(props.match.scheduledAt));
  if (props.match.played && props.match.result) parts.push(resultWord(props.match.result));
  return parts.join(' · ');
});

function resultWord(result) {
  if (result === 'WIN') return 'vitória';
  if (result === 'LOSS') return 'derrota';
  return 'empate';
}
</script>

<style scoped>
.queue {
  align-self: start;
}

.next {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
}

/* Vence `.vc-card__body p`, que é mais específico e deixaria a contagem do tamanho de um rodapé */
.vc-card__body .next__when {
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1.05;
  color: var(--vc-text);
}

.vc-card__body .next__when small {
  display: block;
  margin-top: 4px;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--vc-text-muted);
}

.alliance {
  display: grid;
  gap: 8px;
  min-width: 300px;
}

.side {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px 9px 16px;
  border-radius: var(--vc-radius);
  border: 1px solid var(--vc-border);
  background: var(--vc-surface-muted);
}

/*
 * A faixa da aliança é desenhada por dentro para o realce de "é a nossa" não apagá-la: `is-ours`
 * mexe em border-color, e uma borda esquerda vermelha some junto.
 */
.side--red {
  box-shadow: inset 4px 0 0 #d8413a;
}

.side--blue {
  box-shadow: inset 4px 0 0 #2f6fd0;
}

.side.is-ours {
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
}

.side__label {
  width: 64px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vc-text-muted);
}

.side__teams {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.team {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 0.95rem;
}

.team.is-us {
  color: var(--vc-purple-strong);
}

@media (max-width: 720px) {
  .next {
    grid-template-columns: minmax(0, 1fr);
  }

  .alliance {
    min-width: 0;
  }
}
</style>
