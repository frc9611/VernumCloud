<template>
  <div class="vc-stack">
    <SectionTitle lead="Prêmios" title="e reconhecimentos">
      <template #actions>
        <button v-if="canManage" class="vc-btn vc-btn--small" type="button" @click="openNew">
          <AppIcon name="plus" :size="14" />
          Novo prêmio
        </button>
      </template>
    </SectionTitle>

    <EmptyState v-if="!event.awards.length" title="Nenhum prêmio registrado">
      <template v-if="canManage">
        Registre o que a equipe trouxe de volta: um prêmio de <strong>equipe</strong> alcança todo mundo que
        foi; um <strong>individual</strong>, quem você escolher entre os participantes.
      </template>
      <template v-else>Quando a equipe registrar um prêmio deste evento, ele aparece aqui.</template>
    </EmptyState>

    <div v-else class="vc-grid">
      <article v-for="award in event.awards" :key="award.awardId" class="vc-card awards__card">
        <div class="awards__bar" :style="{ background: colorOf(award) }"></div>
        <div class="vc-card__body">
          <div class="awards__head">
            <AppIcon name="award" :size="22" :style="{ color: colorOf(award) }" />
            <div class="awards__title">
              <strong>{{ award.title }}</strong>
              <span :class="['vc-chip', award.scope === 'TEAM' ? 'vc-chip--purple' : 'vc-chip--info']">
                {{ award.scopeLabel }}
              </span>
            </div>
          </div>
          <p v-if="award.description">{{ award.description }}</p>
          <div class="awards__recipients">
            <span v-if="!award.recipients.length" class="vc-faint">
              <template v-if="award.scope === 'TEAM'">Ninguém recebeu ainda: adicione participantes ao evento.</template>
              <template v-else>Ninguém marcado ainda.</template>
            </span>
            <router-link v-for="person in award.recipients" :key="person.userId" class="awards__recipient"
                         :to="{ name: 'person', params: { id: person.userId } }" :title="person.name">
              <img class="vc-avatar" width="22" height="22" :src="usersApi.pictureUrl(person.userId)" alt="" />
              <span>{{ person.name }}</span>
            </router-link>
          </div>
        </div>
        <footer class="vc-card__footer">
          <span class="vc-faint awards__count">{{ recipientsLabel(award) }}</span>
          <span class="vc-spacer"></span>
          <template v-if="canManage">
            <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(award)">Editar</button>
            <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(award)">Excluir</button>
          </template>
        </footer>
      </article>
    </div>

    <!-- ------------------------------------------------------------ modal -->
    <ModalDialog v-if="modal" :title="editing ? 'Editar prêmio' : 'Novo prêmio'" @close="modal = false">
      <div class="vc-field">
        <label class="vc-label" for="awardTitle">Título</label>
        <input id="awardTitle" class="vc-input" type="text" maxlength="160" v-model="form.title"
               placeholder="Excellence in Engineering Award" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="awardDescription">Descrição (opcional)</label>
        <textarea id="awardDescription" class="vc-textarea" rows="2" maxlength="1000" v-model="form.description"
                  placeholder="Por que a equipe ganhou, o que os juízes destacaram..."></textarea>
      </div>

      <fieldset class="awards__scope">
        <legend class="vc-label">Alcance</legend>
        <label v-for="scope in AWARD_SCOPES" :key="scope.value" class="vc-checkbox awards__scope-option">
          <input type="radio" name="awardScope" :value="scope.value" v-model="form.scope" />
          <span>
            <strong>{{ scope.label }}</strong>
            <span class="awards__scope-hint">{{ scope.hint }}</span>
          </span>
        </label>
      </fieldset>

      <div v-if="form.scope === 'INDIVIDUAL'" class="vc-field">
        <span class="vc-label">Quem recebeu</span>
        <p v-if="!event.participants.length" class="vc-faint" style="margin: 0">
          Ninguém registrado no evento ainda. Adicione os participantes primeiro para poder escolher.
        </p>
        <div v-else class="awards__people">
          <label v-for="participant in event.participants" :key="participant.userId" class="vc-checkbox awards__person">
            <input type="checkbox" :value="participant.userId" v-model="form.recipientUserIds" />
            <img class="vc-avatar" width="22" height="22" :src="usersApi.pictureUrl(participant.userId)" alt="" />
            <span>{{ participant.name }}</span>
            <span v-if="participant.roleLabel" class="vc-faint">· {{ participant.roleLabel }}</span>
          </label>
        </div>
        <p v-if="event.participants.length && !form.recipientUserIds.length" class="vc-faint awards__warning">
          Ninguém marcado: o prêmio fica registrado sem destinatário até você escolher.
        </p>
      </div>

      <div class="vc-field">
        <label class="vc-checkbox">
          <input type="checkbox" v-model="form.ownColor" />
          Cor própria do prêmio (sem ela, o badge usa a cor da equipe)
        </label>
        <div v-if="form.ownColor" class="awards__color">
          <input class="awards__color-input" type="color" v-model="form.color" aria-label="Cor do prêmio" />
          <span class="vc-mono vc-faint">{{ form.color }}</span>
        </div>
      </div>

      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="modal = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!form.title.trim() || saving" @click="save">
          {{ editing ? 'Salvar' : 'Registrar prêmio' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { events as eventsApi, users as usersApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { AWARD_SCOPES } from './eventLabels.js';

/*
 * What the team brought back from the event.
 *
 * A TEAM award reaches every participant and the server keeps that list in step as people are
 * added or removed; an INDIVIDUAL one names its recipients, who have to be participants — so the
 * picker only offers those. A colour is optional: without one the badge takes the team's colour,
 * which is why the cards paint `tenantColor` as the fallback.
 *
 * The award routes answer the award alone, so the panel emits `changed` without a payload and the
 * screen reloads the event.
 */
const props = defineProps({
  event: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
});
const emit = defineEmits(['changed']);
const toast = useToast();

const DEFAULT_COLOR = '#c9a227';

const modal = ref(false);
const editing = ref(null);
const saving = ref(false);
const form = reactive({
  title: '',
  description: '',
  scope: 'TEAM',
  ownColor: false,
  color: DEFAULT_COLOR,
  recipientUserIds: [],
});

function colorOf(award) {
  return award.color || props.event.tenantColor || 'var(--vc-purple)';
}

function recipientsLabel(award) {
  const total = award.recipients.length;
  if (!total) return 'sem destinatário';
  return total === 1 ? '1 pessoa recebeu' : `${total} pessoas receberam`;
}

function openNew() {
  editing.value = null;
  Object.assign(form, {
    title: '', description: '', scope: 'TEAM', ownColor: false, color: DEFAULT_COLOR, recipientUserIds: [],
  });
  modal.value = true;
}

function openEdit(award) {
  editing.value = award;
  Object.assign(form, {
    title: award.title,
    description: award.description || '',
    scope: award.scope,
    ownColor: !!award.color,
    color: award.color || DEFAULT_COLOR,
    recipientUserIds: award.recipients.map((person) => person.userId),
  });
  modal.value = true;
}

async function save() {
  saving.value = true;
  try {
    const body = {
      title: form.title.trim(),
      description: editing.value ? form.description.trim() : (form.description.trim() || null),
      scope: form.scope,
      //On a PUT an empty string clears the colour; on a POST nothing is sent when there is none
      color: form.ownColor ? form.color : (editing.value ? '' : null),
      recipientUserIds: form.scope === 'INDIVIDUAL' ? form.recipientUserIds : null,
    };
    if (editing.value) {
      await eventsApi.updateAward(editing.value.awardId, body);
    } else {
      await eventsApi.createAward(props.event.eventId, body);
    }
    modal.value = false;
    emit('changed');
    toast.success(editing.value ? 'Prêmio salvo!' : 'Prêmio registrado!');
  } catch (error) {
    toast.error(apiMessage(error, editing.value ? 'Erro ao salvar o prêmio' : 'Erro ao registrar o prêmio'));
  } finally {
    saving.value = false;
  }
}

async function remove(award) {
  const sure = window.confirm(
    `Excluir o prêmio "${award.title}"?\n\nO badge desse prêmio some do perfil de quem o recebeu.`,
  );
  if (!sure) return;
  try {
    await eventsApi.removeAward(award.awardId);
    emit('changed');
    toast.info('Prêmio excluído.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao excluir o prêmio'));
  }
}
</script>

<style scoped>
.awards__card {
  display: flex;
  flex-direction: column;
}

.awards__card .vc-card__body {
  flex: 1;
}

.awards__bar {
  height: 5px;
}

.awards__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.awards__head > svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.awards__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.awards__title strong {
  font-size: 1rem;
}

.awards__recipients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.awards__recipient {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 2px;
  border-radius: 20px;
  border: 1px solid var(--vc-border);
  background: var(--vc-surface-muted);
  color: var(--vc-text);
  font-size: 0.8rem;
  text-decoration: none;
}

.awards__recipient:hover {
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
}

.awards__count {
  font-size: 0.8rem;
}

.awards__scope {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.awards__scope legend {
  padding: 0;
  margin-bottom: 4px;
}

.awards__scope-option input {
  accent-color: var(--vc-purple);
}

.awards__scope-option strong {
  display: block;
  font-weight: 600;
}

.awards__scope-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--vc-text-muted);
}

.awards__people {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 8px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
}

.awards__person {
  align-items: center;
  padding: 3px 0;
}

.awards__person input {
  margin-top: 0;
}

.awards__warning {
  margin: 6px 0 0;
  font-size: 0.82rem;
}

.awards__color {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.awards__color-input {
  width: 44px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--vc-border-strong);
  border-radius: var(--vc-radius);
  background: var(--vc-surface);
  cursor: pointer;
}
</style>
