<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Pedidos de acesso</h1>

      <SectionTitle lead="Para" title="Responder" />
      <EmptyState v-if="!pending.length" title="Nenhum pedido aguardando você">
        Você é notificado assim que alguém pedir acesso a algo que você gerencia.
      </EmptyState>
      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr><th>Quem pediu</th><th>Item</th><th>Nível</th><th>Mensagem</th><th>Quando</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="request in pending" :key="request.accessRequestId">
              <td>{{ request.requesterName }}</td>
              <td>{{ request.targetType === 'FOLDER' ? '📁' : '📄' }} {{ request.targetName }}</td>
              <td>{{ request.requestedLevel }}</td>
              <td class="vc-faint">{{ request.message || '—' }}</td>
              <td class="vc-faint">{{ formatWhen(request.createdAt) }}</td>
              <td style="text-align: right; white-space: nowrap">
                <button class="vc-btn vc-btn--small" type="button" @click="decide(request, true)">Aprovar</button>
                <button class="vc-btn vc-btn--danger vc-btn--small" style="margin-left: 6px"
                        type="button" @click="decide(request, false)">Recusar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionTitle lead="Meus" title="Pedidos" />
      <EmptyState v-if="!mine.length" title="Você não pediu acesso a nada">
        Ao abrir uma pasta sem acesso, aparece a opção de solicitar.
      </EmptyState>
      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr><th>Item</th><th>Nível</th><th>Situação</th><th>Resposta</th><th>Quando</th></tr>
          </thead>
          <tbody>
            <tr v-for="request in mine" :key="request.accessRequestId">
              <td>{{ request.targetType === 'FOLDER' ? '📁' : '📄' }} {{ request.targetName }}</td>
              <td>{{ request.requestedLevel }}</td>
              <td><span class="vc-badge" :class="badgeClass(request.status)">{{ request.statusLabel }}</span></td>
              <td class="vc-faint">{{ request.decisionNote || '—' }}</td>
              <td class="vc-faint">{{ formatWhen(request.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import EmptyState from '@/components/EmptyState.vue';
import { cloud } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Two lists: the pedidos the user can decide, because they manage the item, and the ones
 * the user sent, with the answer of each.
 */
const toast = useToast();
const pending = ref([]);
const mine = ref([]);

onMounted(load);

async function load() {
  try {
    const { data } = await cloud.accessRequests();
    pending.value = data;
  } catch (error) {
    pending.value = [];
  }
  try {
    const { data } = await cloud.myAccessRequests();
    mine.value = data;
  } catch (error) {
    mine.value = [];
  }
}

async function decide(request, approve) {
  const note = window.prompt(approve ? 'Observação (opcional):' : 'Motivo da recusa:') || '';
  try {
    if (approve) {
      await cloud.approveAccessRequest(request.accessRequestId, {
        note,
        accessLevel: request.requestedLevel,
      });
      toast.success('Acesso liberado!');
    } else {
      await cloud.denyAccessRequest(request.accessRequestId, { note });
      toast.info('Pedido recusado.');
    }
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao responder o pedido'));
  }
}

function badgeClass(status) {
  if (status === 'APPROVED') return 'vc-badge--on';
  if (status === 'DENIED') return 'vc-badge--off';
  return 'vc-badge--neutral';
}

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
</script>
