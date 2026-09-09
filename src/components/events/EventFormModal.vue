<template>
  <ModalDialog :title="event ? 'Editar evento' : 'Novo evento'" @close="$emit('close')">
    <div class="vc-field">
      <label class="vc-label" for="eventName">Nome do evento</label>
      <input id="eventName" class="vc-input" type="text" maxlength="160" v-model="form.name"
             placeholder="Regional de Brasília 2026" />
    </div>
    <div class="vc-field">
      <label class="vc-label" for="eventKind">Tipo</label>
      <select id="eventKind" class="vc-select" v-model="form.kind">
        <option v-for="kind in EVENT_KINDS" :key="kind.value" :value="kind.value">{{ kind.label }}</option>
      </select>
    </div>
    <div class="vc-row event-form__dates">
      <div class="vc-field">
        <label class="vc-label" for="eventStart">Início</label>
        <input id="eventStart" class="vc-input" type="date" v-model="form.startDate" />
      </div>
      <div class="vc-field">
        <label class="vc-label" for="eventEnd">Fim (opcional)</label>
        <input id="eventEnd" class="vc-input" type="date" :min="form.startDate" v-model="form.endDate" />
      </div>
    </div>
    <div class="vc-field">
      <label class="vc-label" for="eventLocation">Local (opcional)</label>
      <input id="eventLocation" class="vc-input" type="text" maxlength="200" v-model="form.location"
             placeholder="Brasília, DF" />
    </div>
    <div class="vc-field">
      <label class="vc-label" for="eventDescription">Descrição (opcional)</label>
      <textarea id="eventDescription" class="vc-textarea" rows="3" maxlength="2000"
                v-model="form.description"
                placeholder="O que foi, como a equipe se preparou, o que ficou de aprendizado..."></textarea>
    </div>
    <p v-if="endBeforeStart" class="vc-danger-text" style="margin: 0; font-size: 0.85rem">
      O fim não pode vir antes do início.
    </p>
    <template #footer>
      <button class="vc-btn vc-btn--ghost" type="button" @click="$emit('close')">Cancelar</button>
      <button class="vc-btn" type="button" :disabled="!valid || saving" @click="save">
        {{ event ? 'Salvar' : 'Criar evento' }}
      </button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import ModalDialog from '@/components/ModalDialog.vue';
import { events as eventsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { EVENT_KINDS, todayIso } from './eventLabels.js';

/*
 * One modal for creating and editing an event. Creating posts to the team; editing puts to the
 * event. On the edit the server keeps a null and clears an empty string, so location and
 * description go as "" when the person emptied them. The end date cannot be cleared that way (an
 * empty date is read as null, which keeps), so it is sent only when filled.
 */
const props = defineProps({
  tenantId: { type: Number, default: null },
  event: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);
const toast = useToast();

const form = reactive({
  name: props.event?.name || '',
  kind: props.event?.kind || 'COMPETITION',
  startDate: props.event?.startDate || todayIso(),
  endDate: props.event?.endDate || '',
  location: props.event?.location || '',
  description: props.event?.description || '',
});
const saving = ref(false);

const endBeforeStart = computed(() => !!form.endDate && !!form.startDate && form.endDate < form.startDate);
const valid = computed(() => form.name.trim().length > 0 && !!form.startDate && !endBeforeStart.value);

async function save() {
  saving.value = true;
  try {
    const body = {
      name: form.name.trim(),
      kind: form.kind,
      startDate: form.startDate,
      endDate: form.endDate || null,
      location: props.event ? form.location.trim() : (form.location.trim() || null),
      description: props.event ? form.description.trim() : (form.description.trim() || null),
    };
    const { data } = props.event
      ? await eventsApi.update(props.event.eventId, body)
      : await eventsApi.create(props.tenantId, body);
    toast.success(props.event ? 'Evento salvo!' : 'Evento criado!');
    emit('saved', data);
  } catch (error) {
    toast.error(apiMessage(error, props.event ? 'Erro ao salvar o evento' : 'Erro ao criar o evento'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.event-form__dates {
  align-items: flex-start;
}

.event-form__dates .vc-field {
  flex: 1 1 150px;
  min-width: 0;
}
</style>
