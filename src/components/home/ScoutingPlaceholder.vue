<template>
  <div class="vc-stack">
    <AlertBanner variant="warning" title="Scouting ainda não implementado" aside="Próxima etapa do desenvolvimento">
      A tela está reservada e segue o mesmo modelo das outras: abas, banners e cards.
    </AlertBanner>

    <SectionTitle lead="On-Cloud" title="Scouting" />
    <div class="vc-split">
      <div class="vc-grid">
        <PanelCard title="Criar uma Scout Entry">
          <p>Todos os membros podem analisar o desempenho de uma equipe e seu robô durante uma partida.</p>
          <button class="vc-btn" type="button" disabled>Scoutar</button>
        </PanelCard>
        <PanelCard title="Criar uma Scouting Analysis">
          <p>Com os dados dos outros times em mãos é possível criar uma análise para determinar o parceiro de aliança ideal.</p>
          <button class="vc-btn" type="button" disabled>Analisar</button>
        </PanelCard>
      </div>
      <PanelCard title="My Last Scouts" icon="chart">
        <p class="vc-faint" style="margin: 0">Sem dados enquanto o scouting não existir no servidor.</p>
      </PanelCard>
    </div>
  </div>
</template>

<script setup>
import AlertBanner from '@/components/AlertBanner.vue';
import PanelCard from '@/components/PanelCard.vue';
import SectionTitle from '@/components/SectionTitle.vue';

/* The Scouting tab as it was reserved in the mockups: nothing behind it on the server yet. */
</script>
