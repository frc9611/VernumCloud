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
</script>

<style scoped>
.rfid__code {
  margin-left: 6px;
  color: var(--vc-text-muted);
  font-size: 12px;
}
</style>
