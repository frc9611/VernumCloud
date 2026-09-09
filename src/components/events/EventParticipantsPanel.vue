<template>
  <div class="vc-stack">
    <SectionTitle lead="Quem" title="foi">
      <template #actions>
        <span class="vc-faint">{{ countLabel }}</span>
      </template>
    </SectionTitle>

    <EmptyState v-if="!event.participants.length" title="Ninguém registrado ainda">
      <template v-if="canManage">Adicione quem foi ao evento pelo painel abaixo.</template>
      <template v-else>Quando a equipe registrar os participantes, eles aparecem aqui.</template>
    </EmptyState>

    <div v-else class="vc-table-wrap">
      <table class="vc-table">
        <thead>
          <tr>
            <th></th>
            <th>Pessoa</th>
            <th>Papel no evento</th>
            <th>Vínculo</th>
            <th>Prêmios</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="participant in event.participants" :key="participant.userId">
            <td class="participants__avatar-cell">
              <img class="vc-avatar" width="34" height="34" :src="usersApi.pictureUrl(participant.userId)" alt="" />
            </td>
            <td>
              <router-link class="participants__name" :to="{ name: 'person', params: { id: participant.userId } }">
                {{ participant.name }}
              </router-link>
              <span class="participants__username">@{{ participant.username }}</span>
            </td>
            <td>
              <input v-if="canManage" class="vc-input participants__role" type="text" maxlength="120"
                     :value="participant.roleLabel || ''" placeholder="ex.: piloto, pit, apresentação"
                     :aria-label="'Papel de ' + participant.name"
                     @change="saveRole(participant, $event.target.value)"
                     @keydown.enter.prevent="$event.target.blur()" />
              <span v-else>{{ participant.roleLabel || '—' }}</span>
            </td>
            <td>
              <span :class="['vc-chip', participant.member ? 'vc-chip--success' : 'vc-chip--warning']">
                {{ participant.member ? 'membro' : 'alumni' }}
              </span>
            </td>
            <td>
              <span v-if="!awardsOf(participant).length" class="vc-faint">—</span>
              <span v-for="award in awardsOf(participant)" :key="award.awardId" class="vc-chip participants__award">
                <span class="vc-dot" :style="{ background: award.color || event.tenantColor }"></span>
                {{ award.title }}
              </span>
            </td>
            <td v-if="canManage" style="text-align: right">
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="remove(participant)">
                Remover
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PanelCard v-if="canManage" title="Adicionar participantes" icon="userPlus" muted>
      <p>
        Vale para quem é da equipe hoje e para quem já passou por ela — um evento antigo entra do mesmo
        jeito. Quem nunca esteve na equipe o servidor recusa.
      </p>

      <div class="vc-field">
        <label class="vc-label" for="participantSearch">Quem foi</label>
        <div v-if="chosen.length" class="participants__chosen">
          <span v-for="person in chosen" :key="person.userId" class="vc-chip vc-chip--purple">
            <img class="vc-avatar" width="18" height="18" :src="usersApi.pictureUrl(person.userId)" alt="" />
            {{ person.name }}
            <button class="participants__unchoose" type="button" :title="'Tirar ' + person.name + ' da lista'"
                    @click="unchoose(person)">
              <AppIcon name="close" :size="12" />
            </button>
          </span>
        </div>
        <input id="participantSearch" class="vc-input" type="text" autocomplete="off" v-model="search"
               placeholder="Digite um nome ou usuário..." @input="scheduleSearch"
               @keydown.escape="suggestions = []" />
        <div v-if="suggestions.length" class="participants__suggest">
          <button v-for="person in suggestions" :key="person.userId" type="button"
                  class="participants__suggest-item" @click="choose(person)">
            <img class="vc-avatar" width="26" height="26" :src="usersApi.pictureUrl(person.userId)" alt="" />
            <span class="participants__suggest-text">
              <strong>{{ person.name }}</strong>
              <span>@{{ person.username }}<template v-if="teamsOf(person)"> · {{ teamsOf(person) }}</template></span>
            </span>
            <span v-if="!person.active" class="vc-chip vc-chip--warning">desativado</span>
          </button>
        </div>
        <span v-else-if="searching" class="vc-faint participants__hint">Procurando...</span>
        <span v-else-if="searched && search.trim()" class="vc-faint participants__hint">
          Ninguém com esse nome ao seu alcance, ou já está na lista.
        </span>
      </div>

      <div class="vc-field">
        <label class="vc-label" for="participantRole">Papel no evento (opcional, para quem está entrando agora)</label>
        <input id="participantRole" class="vc-input" type="text" maxlength="120" v-model="roleLabel"
               placeholder="ex.: piloto" />
      </div>

      <template #footer>
        <span class="vc-faint">Cada pessoa adicionada ganha o badge de participação e os prêmios de equipe deste evento.</span>
        <span class="vc-spacer"></span>
        <button class="vc-btn" type="button" :disabled="!chosen.length || adding" @click="add">
          {{ addLabel }}
        </button>
      </template>
    </PanelCard>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { events as eventsApi, people as peopleApi, users as usersApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Who went to the event, and the box that adds more people.
 *
 * The picker asks the server (`GET /people?search=`) instead of listing the team: whoever can be
 * registered is a member today or somebody who already left, and the server is the one that knows
 * both. It still refuses a stranger with a 422 whose message names the person, so that message is
 * shown as it came.
 *
 * Every write answers the whole event, which goes up as `changed` so the screen repaints once.
 */
const props = defineProps({
  event: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
});
const emit = defineEmits(['changed']);
const toast = useToast();

const SEARCH_DELAY_MS = 250;

const search = ref('');
const suggestions = ref([]);
const searching = ref(false);
const searched = ref(false);
const chosen = ref([]);
const roleLabel = ref('');
const adding = ref(false);
let searchTimer = null;
let searchSequence = 0;

const countLabel = computed(() => {
  const total = props.event.participants.length;
  return total === 1 ? '1 pessoa' : `${total} pessoas`;
});

const addLabel = computed(() => {
  const total = chosen.value.length;
  if (!total) return 'Adicionar';
  return total === 1 ? 'Adicionar 1 pessoa' : `Adicionar ${total} pessoas`;
});

onBeforeUnmount(() => clearTimeout(searchTimer));

/* --------------------------------------------------------------- table */

function awardsOf(participant) {
  const ids = new Set(participant.awardIds || []);
  return props.event.awards.filter((award) => ids.has(award.awardId));
}

async function saveRole(participant, value) {
  const next = value.trim();
  if (next === (participant.roleLabel || '')) return;
  try {
    const { data } = await eventsApi.updateParticipant(props.event.eventId, participant.userId, { roleLabel: next });
    emit('changed', data);
    toast.success('Papel atualizado.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar o papel'));
  }
}

async function remove(participant) {
  const sure = window.confirm(
    `Remover ${participant.name} do evento?\n\nO badge de participação e os prêmios que a pessoa ganhou aqui somem do perfil dela.`,
  );
  if (!sure) return;
  try {
    const { data } = await eventsApi.removeParticipant(props.event.eventId, participant.userId);
    emit('changed', data);
    toast.info('Participante removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o participante'));
  }
}

/* -------------------------------------------------------------- picker */

/** Waits for the typing to stop before asking the server. */
function scheduleSearch() {
  clearTimeout(searchTimer);
  searched.value = false;
  if (!search.value.trim()) {
    suggestions.value = [];
    searching.value = false;
    return;
  }
  searching.value = true;
  searchTimer = setTimeout(runSearch, SEARCH_DELAY_MS);
}

async function runSearch() {
  const text = search.value.trim();
  const sequence = ++searchSequence;
  try {
    const { data } = await peopleApi.search(text);
    //A slower answer to an older text must not overwrite the newer one
    if (sequence !== searchSequence) return;
    const taken = new Set([
      ...props.event.participants.map((participant) => participant.userId),
      ...chosen.value.map((person) => person.userId),
    ]);
    suggestions.value = data.filter((person) => !taken.has(person.userId));
  } catch (error) {
    if (sequence !== searchSequence) return;
    suggestions.value = [];
  } finally {
    if (sequence === searchSequence) {
      searching.value = false;
      searched.value = true;
    }
  }
}

function teamsOf(person) {
  return (person.teams || []).map((team) => team.name).join(', ');
}

function choose(person) {
  chosen.value = [...chosen.value, person];
  suggestions.value = suggestions.value.filter((item) => item.userId !== person.userId);
  search.value = '';
  searched.value = false;
  suggestions.value = [];
}

function unchoose(person) {
  chosen.value = chosen.value.filter((item) => item.userId !== person.userId);
}

async function add() {
  if (!chosen.value.length) return;
  adding.value = true;
  try {
    const body = {
      userIds: chosen.value.map((person) => person.userId),
      roleLabel: roleLabel.value.trim() || null,
    };
    const { data } = await eventsApi.addParticipants(props.event.eventId, body);
    const total = chosen.value.length;
    chosen.value = [];
    roleLabel.value = '';
    search.value = '';
    suggestions.value = [];
    emit('changed', data);
    toast.success(total === 1 ? 'Participante adicionado!' : `${total} participantes adicionados!`);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar participantes'));
  } finally {
    adding.value = false;
  }
}
</script>

<style scoped>
.participants__avatar-cell {
  width: 46px;
  padding-right: 0;
}

.participants__name {
  font-weight: 500;
  color: var(--vc-text);
  text-decoration: none;
}

.participants__name:hover {
  color: var(--vc-purple-strong);
  text-decoration: underline;
}

.participants__username {
  display: block;
  font-size: 0.78rem;
  color: var(--vc-text-faint);
}

.participants__role {
  min-width: 180px;
  padding: 5px 9px;
  font-size: 0.86rem;
}

.participants__award {
  margin: 2px 4px 2px 0;
}

.participants__chosen {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.participants__chosen .vc-chip {
  padding-left: 4px;
}

.participants__unchoose {
  display: inline-flex;
  align-items: center;
  border: none;
  background: none;
  padding: 0 0 0 2px;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;
}

.participants__unchoose:hover {
  opacity: 1;
}

.participants__suggest {
  margin-top: 6px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  max-height: 260px;
  overflow-y: auto;
}

.participants__suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--vc-border);
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
}

.participants__suggest-item:last-child {
  border-bottom: none;
}

.participants__suggest-item:hover {
  background: var(--vc-purple-soft);
}

.participants__suggest-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.participants__suggest-text strong {
  font-size: 0.9rem;
  font-weight: 500;
}

.participants__suggest-text span {
  font-size: 0.78rem;
  color: var(--vc-text-muted);
}

.participants__hint {
  display: block;
  margin-top: 6px;
  font-size: 0.85rem;
}
</style>
