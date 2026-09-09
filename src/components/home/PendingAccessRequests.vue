<template>
  <section class="vc-stack">
    <SectionTitle lead="Pedidos" title="de Acesso">
      <template #actions>
        <router-link class="vc-btn vc-btn--ghost vc-btn--small" :to="{ name: 'accessRequests' }">Ver todos</router-link>
      </template>
    </SectionTitle>
    <div class="vc-table-wrap">
      <table class="vc-table">
        <thead>
          <tr><th>Quem pediu</th><th>Item</th><th>Nível</th><th>Quando</th></tr>
        </thead>
        <tbody>
          <tr v-for="request in requests.slice(0, 5)" :key="request.accessRequestId">
            <td>{{ request.requesterName }}</td>
            <td>{{ request.targetName }}</td>
            <td>{{ request.requestedLevel }}</td>
            <td class="vc-faint">{{ formatWhen(request.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import SectionTitle from '@/components/SectionTitle.vue';

/* The cloud access requests waiting for whoever is reading to decide. */
defineProps({
  requests: { type: Array, required: true },
});

function formatWhen(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}
</script>
