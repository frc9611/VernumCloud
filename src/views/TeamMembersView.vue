<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">{{ auth.activeTenantName }}</h1>
        <router-link v-if="auth.can('MEMBER_INVITE')" class="vc-btn" :to="{ name: 'adminMembers' }">
          Gerenciar membros
        </router-link>
      </div>

      <input class="vc-input" type="text" placeholder="Buscar por nome, usuário, e-mail ou divisão" v-model="search" />

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th></th><th>Nome</th><th>Usuário</th><th>E-mail</th><th>Cargo na equipe</th><th>Divisões</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filtered" :key="member.membershipId">
              <td><img class="vc-avatar" width="34" height="34" :src="pictureOf(member.user.userId)" alt="" /></td>
              <td><PersonLink :user-id="member.user.userId" :name="member.user.name" /></td>
              <td class="vc-faint">{{ member.user.username }}</td>
              <td class="vc-faint">{{ member.user.email }}</td>
              <td><span class="vc-badge vc-badge--purple">{{ member.roleLabel }}</span></td>
              <td>
                <span v-for="division in member.divisions" :key="division.divisionMembershipId" class="vc-chip" style="margin: 2px">
                  {{ division.divisionVisibleName }}<template v-if="division.position"> · {{ division.position }}</template>
                </span>
                <span v-if="!member.divisions.length" class="vc-faint">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!filtered.length" title="Nenhum membro encontrado">
          Ajuste a busca ou adicione pessoas à equipe.
        </EmptyState>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import PersonLink from '@/components/PersonLink.vue';
import { authStore } from '@/store/auth.js';
import { tenants, users } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

const auth = authStore();
const toast = useToast();
const members = ref([]);
const search = ref('');

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await tenants.members(auth.activeTenantId);
    members.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar membros'));
  }
}

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return members.value;
  return members.value.filter((member) => {
    const divisions = member.divisions.map((division) => division.divisionVisibleName).join(' ');
    return [member.user.name, member.user.username, member.user.email, member.roleLabel, divisions]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(term));
  });
});

function pictureOf(userId) {
  return users.pictureUrl(userId);
}
</script>
