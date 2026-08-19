<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <div>
          <h1 class="vc-title vc-title--underlined">{{ division.visibleName || 'Divisão' }}</h1>
          <p class="vc-faint" style="margin: 6px 0 0">
            {{ division.slug }}<template v-if="parentName"> · subdivisão de {{ parentName }}</template>
          </p>
        </div>
        <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'divisions' }">Voltar</router-link>
      </div>

      <p v-if="division.description" class="vc-muted" style="margin: 0">{{ division.description }}</p>

      <SectionTitle lead="Membros" title="da Divisão">
        <template #actions>
          <button v-if="canManage" class="vc-btn vc-btn--small" type="button" @click="openAdd">
            Adicionar membro
          </button>
        </template>
      </SectionTitle>

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Nome</th><th>E-mail</th><th>Cargo na divisão</th><th>Lidera</th>
              <th v-if="canManage"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.divisionMembershipId">
              <td>{{ member.name }}</td>
              <td class="vc-faint">{{ member.email }}</td>
              <td>
                <span v-if="!canManage">{{ member.position || '—' }}</span>
                <input v-else class="vc-input" style="max-width: 190px" type="text"
                       :value="member.position || ''" placeholder="Sem cargo"
                       @change="savePosition(member, $event.target.value)" />
              </td>
              <td>
                <span v-if="!canManage" class="vc-badge" :class="member.leader ? 'vc-badge--on' : 'vc-badge--neutral'">
                  {{ member.leader ? 'Sim' : 'Não' }}
                </span>
                <label v-else class="vc-checkbox">
                  <input type="checkbox" :checked="member.leader" @change="saveLeader(member, $event.target.checked)" />
                  Líder
                </label>
              </td>
              <td v-if="canManage" style="text-align: right">
                <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="remove(member)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!members.length" title="Nenhum membro nesta divisão">
          Adicione pessoas da equipe para começar.
        </EmptyState>
      </div>
    </div>

    <ModalDialog v-if="adding" title="Adicionar membro à divisão" @close="adding = false">
      <div class="vc-field">
        <label class="vc-label" for="member">Membro da equipe</label>
        <select id="member" class="vc-select" v-model="newMember.userId">
          <option value="">Escolha uma pessoa</option>
          <option v-for="option in available" :key="option.user.userId" :value="option.user.userId">
            {{ option.user.name }} ({{ option.roleLabel }})
          </option>
        </select>
      </div>
      <div class="vc-field">
        <label class="vc-label" for="position">Cargo na divisão</label>
        <input id="position" class="vc-input" type="text" v-model="newMember.position"
               placeholder="Programador, Mentor, Capitã..." />
      </div>
      <label class="vc-checkbox">
        <input type="checkbox" v-model="newMember.leader" />
        Lidera esta divisão e suas subdivisões
      </label>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="adding = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!newMember.userId" @click="add">Adicionar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import EmptyState from '@/components/EmptyState.vue';
import { authStore } from '@/store/auth.js';
import { divisions, tenants } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/* One division: what it is and who is in it, with the cargo of each person. */
const route = useRoute();
const toast = useToast();
const auth = authStore();

const divisionId = route.params.id;
const division = ref({});
const parentName = ref('');
const members = ref([]);
const teamMembers = ref([]);
const adding = ref(false);
const newMember = reactive({ userId: '', position: '', leader: false });

const canManage = computed(() => auth.can('DIVISION_MEMBER_MANAGE'));

/** People of the team that are not in this division yet. */
const available = computed(() => {
  const already = new Set(members.value.map((member) => member.userId));
  return teamMembers.value.filter((member) => !already.has(member.user.userId));
});

onMounted(load);

async function load() {
  try {
    const { data } = await divisions.get(divisionId);
    division.value = data;
    if (data.parentDivisionId) {
      const parent = await divisions.get(data.parentDivisionId);
      parentName.value = parent.data.visibleName;
    }
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar divisão'));
  }
  await loadMembers();
}

async function loadMembers() {
  try {
    const { data } = await divisions.members(divisionId);
    members.value = data;
  } catch (error) {
    members.value = [];
  }
}

async function openAdd() {
  adding.value = true;
  newMember.userId = '';
  newMember.position = '';
  newMember.leader = false;
  try {
    const { data } = await tenants.members(auth.activeTenantId);
    teamMembers.value = data;
  } catch (error) {
    teamMembers.value = [];
  }
}

async function add() {
  try {
    await divisions.addMember(divisionId, { ...newMember });
    adding.value = false;
    await loadMembers();
    toast.success('Membro adicionado à divisão!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao adicionar membro'));
  }
}

async function savePosition(member, position) {
  try {
    await divisions.updateMember(divisionId, member.userId, { position });
    toast.success('Cargo atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar cargo'));
  }
}

async function saveLeader(member, leader) {
  try {
    await divisions.updateMember(divisionId, member.userId, { leader });
    member.leader = leader;
    toast.success(leader ? 'Agora lidera a divisão.' : 'Não lidera mais a divisão.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar liderança'));
  }
}

async function remove(member) {
  try {
    await divisions.removeMember(divisionId, member.userId);
    await loadMembers();
    toast.info('Membro removido da divisão.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover membro'));
  }
}
</script>
