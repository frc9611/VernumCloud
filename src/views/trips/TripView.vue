<template>
  <main class="vc-page">
    <div v-if="trip.tripId" class="vc-stack">
      <div class="vc-row vc-row--between">
        <div>
          <h1 class="vc-title vc-title--underlined">{{ trip.title }}</h1>
          <p class="vc-faint" style="margin: 6px 0 0">
            Convite de {{ trip.invitedByName }} · {{ trip.tenantName }}
          </p>
        </div>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'home' }">Voltar</router-link>
      </div>

      <AlertBanner v-if="trip.status === 'CANCELLED'" variant="danger" title="Viagem cancelada.">
        Ela continua aqui só para registro. Não há mais o que enviar.
      </AlertBanner>
      <AlertBanner v-else-if="!trip.open" variant="warning" title="Envio encerrado."
                   :aside="trip.statusLabel">
        Esta viagem não está mais recebendo respostas nem documentos. O que você já enviou continua
        acessível abaixo.
      </AlertBanner>

      <PanelCard :title="trip.destination" icon="mapPin">
        <div class="vc-row" style="gap: 22px; flex-wrap: wrap">
          <div>
            <p class="vc-label" style="margin: 0">Saída</p>
            <p style="margin: 2px 0 0; font-weight: 600">
              {{ trip.departureAt ? formatWhen(trip.departureAt) : 'A definir' }}
            </p>
          </div>
          <div>
            <p class="vc-label" style="margin: 0">Retorno</p>
            <p style="margin: 2px 0 0; font-weight: 600">{{ formatWhen(trip.returnAt) }}</p>
          </div>
          <div>
            <p class="vc-label" style="margin: 0">Transporte</p>
            <p style="margin: 2px 0 0; font-weight: 600">
              <AppIcon :name="trip.transportIcon || 'plane'" :size="15" />
              {{ trip.transportLabel }}
            </p>
          </div>
        </div>
        <p v-if="trip.description" class="vc-muted" style="margin: 14px 0 0; white-space: pre-line">
          {{ trip.description }}
        </p>
      </PanelCard>

      <!-- Going or not, answered on the same screen as the documents -->
      <PanelCard title="Você vai?" icon="check">
        <div class="vc-row">
          <span :class="['vc-chip', answerChip]">{{ trip.myAnswerLabel }}</span>
          <span v-if="trip.myAnsweredAt" class="vc-faint">
            respondido em {{ formatWhen(trip.myAnsweredAt) }}
          </span>
        </div>
        <template v-if="trip.open">
          <div class="vc-field" style="margin-top: 12px">
            <label class="vc-label" for="note">Observação (opcional)</label>
            <input id="note" class="vc-input" type="text" maxlength="500" v-model="note"
                   placeholder="Alergia, restrição alimentar, quem vai buscar..." />
          </div>
          <div class="vc-row">
            <button class="vc-btn" type="button" :disabled="saving" @click="answer('GOING')">
              Eu vou
            </button>
            <button class="vc-btn vc-btn--outline" type="button" :disabled="saving"
                    @click="answer('NOT_GOING')">
              Não vou
            </button>
          </div>
        </template>
        <p v-else-if="trip.myNote" class="vc-muted" style="margin: 10px 0 0">{{ trip.myNote }}</p>
      </PanelCard>

      <SectionTitle lead="Documentos" title="Pedidos" />
      <EmptyState v-if="!trip.documents.length" title="Nenhum documento pedido">
        A organização ainda não pediu nada para esta viagem.
      </EmptyState>

      <div
        v-for="document in trip.documents"
        :key="document.tripDocumentId"
        :class="['vc-trip-doc', submissionOf(document) ? 'is-done' : '']"
      >
        <AppIcon :name="submissionOf(document) ? 'check' : 'file'" :size="20" />
        <div class="vc-trip-doc__body">
          <p class="vc-trip-doc__name" style="margin: 0">
            {{ document.name }}
            <span v-if="document.required" class="vc-chip vc-chip--danger">obrigatório</span>
          </p>
          <p v-if="document.description" class="vc-faint" style="margin: 2px 0 0">
            {{ document.description }}
          </p>
          <p v-if="submissionOf(document)" class="vc-faint" style="margin: 4px 0 0">
            Enviado: {{ submissionOf(document).originalName }} ·
            {{ formatWhen(submissionOf(document).submittedAt) }}
          </p>
        </div>

        <div class="vc-row" style="gap: 6px">
          <button v-if="document.hasTemplate" class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                  @click="downloadTemplate(document)">
            <AppIcon name="download" :size="14" />
            Modelo
          </button>
          <button v-if="submissionOf(document)" class="vc-btn vc-btn--outline vc-btn--small"
                  type="button" @click="downloadMine(document)">
            <AppIcon name="download" :size="14" />
            Meu envio
          </button>
          <label v-if="trip.open" class="vc-btn vc-btn--small">
            <AppIcon name="upload" :size="14" />
            {{ submissionOf(document) ? 'Trocar' : 'Enviar' }}
            <input type="file" style="display: none" accept=".pdf,image/*"
                   @change="upload(document, $event)" />
          </label>
        </div>
      </div>

      <p class="vc-faint" style="margin: 0">
        Seus documentos ficam com a organização da viagem. Você abre e baixa o que enviou por aqui —
        a pasta onde eles são guardados não é sua.
      </p>
    </div>

    <EmptyState v-else-if="!loading" title="Convite não encontrado">
      Essa viagem não existe ou o convite não é para você.
    </EmptyState>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { trips as tripsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The trip as the person invited reads it.
 *
 * Everything here goes through the routes of the trip and never through the file manager: the upload,
 * the template, the copy of what was sent. The person is not given the id of any file of the cloud,
 * which is what keeps them out of the folder while letting them read the one document they put in it.
 *
 * Once the trip closes the screen keeps working in read mode — what somebody handed in is theirs to
 * fetch afterwards, and losing the page the moment the deadline passes helps nobody.
 */
const route = useRoute();
const toast = useToast();

const trip = ref({ documents: [], mySubmissions: [] });
const note = ref('');
const loading = ref(true);
const saving = ref(false);

const answerChip = computed(() => {
  if (trip.value.myAnswer === 'GOING') return 'vc-chip--success';
  if (trip.value.myAnswer === 'NOT_GOING') return 'vc-chip--danger';
  return 'vc-chip--warning';
});

onMounted(load);
watch(() => route.params.id, load);

async function load() {
  loading.value = true;
  try {
    const { data } = await tripsApi.invitation(route.params.id);
    trip.value = data;
    note.value = data.myNote || '';
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir a viagem'));
  } finally {
    loading.value = false;
  }
}

function submissionOf(document) {
  return (trip.value.mySubmissions || [])
    .find((item) => item.tripDocumentId === document.tripDocumentId) || null;
}

async function answer(value) {
  saving.value = true;
  try {
    const { data } = await tripsApi.answer(trip.value.tripId, { answer: value, note: note.value });
    trip.value = data;
    toast.success(value === 'GOING' ? 'Boa viagem!' : 'Resposta registrada.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao responder'));
  } finally {
    saving.value = false;
  }
}

async function upload(document, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    await tripsApi.submit(trip.value.tripId, document.tripDocumentId, file);
    await load();
    toast.success('Documento enviado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar o documento'));
  }
}

async function downloadTemplate(document) {
  await deliver(() => tripsApi.downloadTemplate(trip.value.tripId, document.tripDocumentId),
    document.templateName || 'modelo');
}

async function downloadMine(document) {
  const submission = submissionOf(document);
  if (!submission) return;
  await deliver(() => tripsApi.downloadSubmission(trip.value.tripId, submission.tripSubmissionId),
    submission.originalName || 'documento');
}

/* Opens what the browser can show and downloads the rest, the same way the file manager does. */
async function deliver(request, fallbackName) {
  try {
    const response = await request();
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
    if (['image/', 'application/pdf', 'text/'].some((prefix) => contentType.startsWith(prefix))) {
      window.open(url, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao abrir o arquivo'));
  }
}

function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
</script>
