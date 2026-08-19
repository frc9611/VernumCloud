<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Sobre o Vernum Cloud</h1>

      <p class="vc-muted">
        O Vernum Cloud é a plataforma que equipes de robótica usam para gerenciar arquivos, divisões,
        membros e processos seletivos. Cada equipe é um tenant independente: tem suas próprias divisões e
        subdivisões, seus arquivos e suas permissões, e uma pessoa pode fazer parte de mais de uma equipe
        com um papel diferente em cada uma.
      </p>

      <SectionTitle lead="Informações do" title="Servidor" />
      <div v-if="status === 'connected'" class="vc-table-wrap">
        <table class="vc-table">
          <tbody>
            <tr><th>Hora UTC</th><td class="vc-mono">{{ info.timeUTC }}</td></tr>
            <tr><th>Hora local</th><td class="vc-mono">{{ info.timeLocal }}</td></tr>
            <tr><th>Timezone</th><td class="vc-mono">{{ info.timezone }}</td></tr>
            <tr><th>Java</th><td class="vc-mono">{{ info.javaVersion }}</td></tr>
            <tr><th>Versão</th><td class="vc-mono">{{ info.vernumVersion }}</td></tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="status === 'connecting'" class="vc-faint">Obtendo informações...</p>
      <AlertBanner v-else variant="danger" icon="!" title="Falha ao conectar com o servidor.">
        Contate a equipe de P&amp;D.
      </AlertBanner>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import SectionTitle from '@/components/SectionTitle.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import { session } from '@/services/api.js';

const info = ref({});
const status = ref('connecting');

onMounted(async () => {
  try {
    const { data } = await session.serverInfo();
    info.value = data;
    status.value = 'connected';
  } catch (error) {
    status.value = 'failed';
  }
});
</script>
