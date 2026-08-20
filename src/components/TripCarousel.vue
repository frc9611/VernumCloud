<template>
  <section v-if="cards.length" class="vc-stack" style="gap: 10px">
    <SectionTitle lead="Suas" title="Viagens" />
    <div class="vc-carousel">
      <router-link
        v-for="card in cards"
        :key="card.tripId"
        class="vc-trip vc-trip--edge"
        :style="{ borderLeftColor: card.tenantColor || 'var(--vc-purple)' }"
        :to="{ name: 'trip', params: { id: card.tripId } }"
      >
        <div class="vc-trip__head">
          <AppIcon :name="card.transportIcon || 'plane'" :size="18" />
          <span class="vc-trip__title">{{ card.title }}</span>
        </div>
        <span class="vc-trip__where">{{ card.destination }}</span>

        <span class="vc-trip__countdown">{{ countdown(card) }}</span>
        <span class="vc-faint">{{ when(card) }}</span>

        <div class="vc-trip__foot">
          <span v-if="card.needsAnswer" class="vc-chip vc-chip--warning">Falta responder</span>
          <span v-else-if="card.declined" class="vc-chip">Você não vai</span>
          <span v-else class="vc-chip vc-chip--success">Você vai</span>
          <span v-if="card.pendingDocuments" class="vc-chip vc-chip--danger">
            {{ card.pendingDocuments }} documento(s)
          </span>
          <span class="vc-chip">{{ card.tenantName }}</span>
        </div>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AppIcon from './AppIcon.vue';
import SectionTitle from './SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { trips as tripsApi } from '@/services/api.js';

/*
 * The trips of whoever is reading, above the announcement board.
 *
 * Nothing shows when there is nothing: a carousel of zero cards is a heading and a gap.
 *
 * The countdown is worked out here and not on the server. A "faltam 12 dias" baked into a response is
 * wrong the moment the page stays open, and this one stays open all afternoon — so the server sends
 * the moment to count to and `tick` moves once a minute.
 */
const auth = authStore();
const cards = ref([]);
const tick = ref(Date.now());
let timer = null;

onMounted(async () => {
  await load();
  timer = setInterval(() => { tick.value = Date.now(); }, 60000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

async function load() {
  if (!auth.isAuth) return;
  try {
    const { data } = await tripsApi.mine();
    cards.value = data;
  } catch (error) {
    //A board without the carousel is still a board: never turn this into an error on the home screen
    cards.value = [];
  }
}

/* Reading the string as local time, which is what the person typed into the form. */
function at(value) {
  return value ? new Date(value).getTime() : null;
}

const now = computed(() => tick.value);

/**
 * How long until it starts, in the unit somebody would actually say out loud: hours on the last day,
 * days for the next couple of months, months and days beyond that.
 */
function countdown(card) {
  const target = at(card.countdownAt);
  if (!target) return '';
  if (card.inTransit) return 'Em viagem';

  const diff = target - now.value;
  if (diff <= 0) return 'É hoje';

  const hours = Math.floor(diff / 3600000);
  if (hours < 48) {
    if (hours < 1) return `Em ${Math.max(1, Math.floor(diff / 60000))} min`;
    return `Em ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 60) return `Em ${days} dias`;
  const months = Math.floor(days / 30);
  const rest = days - months * 30;
  return rest ? `Em ${months} meses e ${rest} dias` : `Em ${months} meses`;
}

/** Says what the countdown is counting to, which is not always the departure. */
function when(card) {
  if (card.inTransit) return 'Retorno em ' + format(card.returnAt);
  if (card.countdownIsReturn) return 'Retorno em ' + format(card.returnAt) + ' · saída a definir';
  return 'Saída em ' + format(card.departureAt);
}

function format(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}
</script>
