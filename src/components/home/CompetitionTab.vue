<template>
  <div class="vc-stack">
    <!--
      A faixa do topo não pertence a evento nenhum: ela responde "qual é a próxima coisa", que com
      dois eventos ao mesmo tempo não é a mesma pergunta que "o que tem neste evento aqui".
    -->
    <NextMatchCard
      v-if="competition.nextMatch"
      :match="competition.nextMatch"
      :team-number="teamNumber"
      :event-name="competition.nextMatchEventName"
      :show-event="competition.events.length > 1"
    />

    <EventPanel v-for="event in competition.events" :key="event.linkId" :event="event" />

    <EmptyState v-if="!competition.events.length" title="Nenhuma competição em cartaz">
      Esta aba aparece enquanto a equipe está competindo.
    </EmptyState>
  </div>
</template>

<script setup>
import EmptyState from '@/components/EmptyState.vue';
import EventPanel from '@/components/competition/EventPanel.vue';
import NextMatchCard from '@/components/competition/NextMatchCard.vue';

/*
 * A aba que substituiu a de Scouting.
 *
 * Ela só existe enquanto há competição em cartaz, então o estado vazio aqui quase nunca aparece —
 * ele cobre a janela entre a última partida acabar e a próxima leitura do servidor chegar.
 */
defineProps({
  competition: { type: Object, required: true },
  teamNumber: { type: [String, Number], default: '' },
});
</script>
