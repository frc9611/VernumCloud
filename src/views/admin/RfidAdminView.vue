<template>
  <main class="vc-page vc-page--wide">
    <SectionTitle lead="Cartões" title="RFID">
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'attendance' }">Presença</router-link>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'adminApiKeys' }">Chaves de API</router-link>
      </template>
    </SectionTitle>

    <AlertBanner variant="info" icon="card" title="O cartão é da pessoa, não da equipe">
      O mesmo cartão marca a presença dela em todas as equipes de que participa, então remover um
      cartão aqui o desliga em todas elas, e não só nesta. Ninguém cadastra cartão por outra pessoa:
      cada um encosta o próprio no leitor de cadastro.
    </AlertBanner>

    <!--
      The health of the room, before the list of cards: a reader that fell over tells nobody, and
      whoever notices is whoever runs the room — not whoever runs the API keys.
    -->
    <PanelCard v-if="showReaders" title="Leitores da sala" icon="card" muted>
      <p class="vc-faint">
        A única prova de que um leitor está vivo é o último cartão que passou nele.
      </p>
      <div v-for="reader in readers" :key="reader.apiKeyId" class="vc-row">
        <span>
          <strong>{{ reader.visibleName }}</strong>
          <code class="rfid__code">{{ reader.prefix }}</code>
          <span v-if="reader.appName" class="vc-faint"> · {{ reader.appName }}</span>
        </span>
        <span class="vc-spacer"></span>
        <!-- The title is the exact timestamp; the phrase next to it is the one read at a glance -->
        <span class="vc-faint" :title="reader.lastUsedAt ? formatWhen(reader.lastUsedAt) : ''">
          {{ lastSeen(reader) }}
        </span>
        <span :class="['vc-chip', chipOf(reader.status)]">{{ reader.statusLabel }}</span>
      </div>
      <EmptyState v-if="!readers.length" title="Nenhum leitor nesta equipe">
        Um leitor entra com uma chave de API que carregue a permissão de autenticar tags. Enquanto
        não houver nenhuma, os cartões só marcam presença pelo quiosque da web.
      </EmptyState>
    </PanelCard>

    <div class="vc-table-wrap" v-if="tags.length">
      <table class="vc-table">
        <thead>
          <tr><th>Pessoa</th><th>Cartão</th><th>Vale em</th><th>Cadastrado</th><th>Último uso</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.rfidTagId">
            <td><strong>{{ tag.userName }}</strong></td>
            <td>
              {{ tag.visibleName }}
              <code class="rfid__code">••••{{ tag.uidSuffix }}</code>
            </td>
            <td>
              <span v-for="name in tag.tenantNames" :key="name" class="vc-chip">{{ name }}</span>
            </td>
            <td class="vc-faint">{{ formatWhen(tag.createdAt) }}</td>
            <td class="vc-faint">{{ tag.lastUsedAt ? formatWhen(tag.lastUsedAt) : 'nunca' }}</td>
            <td style="text-align: right">
              <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(tag)">
                Remover
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState v-else title="Nenhum cartão cadastrado">
      Cada pessoa cadastra o próprio cartão encostando-o no leitor de cadastro, com o usuário e a
      senha dela.
    </EmptyState>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import { authStore } from '@/store/auth.js';
import { rfid } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The cards of everybody in the team, for whoever manages them.
 *
 * This screen only reads and revokes. There is no route that registers a card for
 * somebody else, and the pair here is the same one Apps and API keys already form:
 * the person carries the credential, the team keeps the list.
 */
const auth = authStore();
const toast = useToast();

const tags = ref([]);
const readers = ref([]);
const showReaders = ref(false);

/* The chip of each state. NUNCA keeps the neutral chip on purpose: a key that never spoke has not
 * gone silent, it has simply not been used yet, and painting that red would spend the alarm. */
const READER_CHIPS = {
  ATIVO: 'vc-chip--success',
  QUIETO: 'vc-chip--warning',
  SEM_SINAL: 'vc-chip--danger',
};

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await rfid.teamTags(auth.activeTenantId);
    tags.value = data;
  } catch (error) {
    tags.value = [];
    toast.error(apiMessage(error, 'Erro ao carregar os cartões'));
  }
  await loadReaders();
}

/*
 * A secondary read, so a failure hides the card instead of becoming a toast: whoever gets a 403 here
 * does not reach the readers and has nothing to do with the warning, and the screen that matters —
 * the list of cards — has already loaded.
 */
async function loadReaders() {
  try {
    const { data } = await rfid.readers(auth.activeTenantId);
    readers.value = data;
    showReaders.value = true;
  } catch (error) {
    readers.value = [];
    showReaders.value = false;
  }
}

async function remove(tag) {
  const here = auth.activeTenant?.visibleName || 'esta equipe';
  const reach = (tag.tenantNames || []).length > 1
    ? ` Ele para de funcionar em todas as equipes dessa pessoa, não só em ${here}.`
    : '';
  if (!window.confirm(`Remover o cartão "${tag.visibleName}" de ${tag.userName}?${reach}`)) {
    return;
  }
  try {
    await rfid.removeTag(tag.rfidTagId);
    await load();
    toast.success('Cartão removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o cartão'));
  }
}

function formatWhen(value) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/*
 * How long ago the reader was last heard from, out of the minutes the server already counted. The
 * arithmetic is the server's on purpose: its clock is what decides the state of the reader, so
 * redoing the subtraction here would leave the phrase and the chip disagreeing whenever this
 * computer runs fast. It is also why this is not the formatAgo() of services/time.js — that one
 * swaps the count for a bare date after a week, exactly when "há 12 dias" is the news.
 */
function lastSeen(reader) {
  const minutes = reader.minutesSinceLastUse;
  //The same word the cards table already uses for a card nobody ever passed
  if (minutes === null || minutes === undefined) return 'nunca';
  if (minutes < 2) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'há 1 hora' : `há ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

function chipOf(status) {
  return READER_CHIPS[status] || '';
}
</script>

<style scoped>
.rfid__code {
  margin-left: 6px;
  color: var(--vc-text-muted);
  font-size: 12px;
}
</style>
