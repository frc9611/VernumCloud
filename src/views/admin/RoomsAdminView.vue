<template>
  <main class="vc-page">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Salas</h1>
        <button class="vc-btn" type="button" @click="openCreate">Nova sala</button>
      </div>

      <p class="vc-muted" style="margin: 0">
        Uma sala agrupa as equipes que dividem o mesmo espaço físico. Presença usa isso: uma pessoa
        não está em duas salas ao mesmo tempo, então quando as equipes dela tocam mais de uma, o
        quiosque tem que perguntar qual. Para colocar uma equipe numa sala, edite a equipe em
        <router-link :to="{ name: 'adminTenants' }">Admin → Equipes</router-link>.
      </p>

      <p v-if="loading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!rooms.length" title="Nenhuma sala ainda">
        Crie uma sala e depois coloque as equipes de dentro dela nela.
      </EmptyState>

      <div v-else class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr><th>Sala</th><th>Equipes</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="room in rooms" :key="room.roomId">
              <td>{{ room.name }}</td>
              <td>
                <span v-if="!room.teams.length" class="vc-faint">nenhuma equipe ainda</span>
                <span v-else class="vc-row" style="flex-wrap: wrap; gap: 4px">
                  <span v-for="team in room.teams" :key="team.tenantId" class="vc-chip">
                    {{ team.visibleName }}<template v-if="team.teamNumber"> #{{ team.teamNumber }}</template>
                  </span>
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap">
                <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="openEdit(room)">
                  Renomear
                </button>
                <button class="vc-btn vc-btn--danger vc-btn--small" style="margin-left: 6px" type="button"
                        :disabled="!!room.teams.length" :title="room.teams.length ? 'Tire as equipes da sala antes de removê-la' : ''"
                        @click="remove(room)">
                  Remover
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ModalDialog v-if="editing" :title="form.roomId ? 'Renomear sala' : 'Nova sala'" @close="editing = false">
      <div class="vc-field">
        <label class="vc-label" for="room-name">Nome</label>
        <input id="room-name" class="vc-input" type="text" v-model="form.name" maxlength="80"
               placeholder="Sala São Paulo" />
      </div>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="editing = false">Cancelar</button>
        <button class="vc-btn" type="button" :disabled="!form.name.trim()" @click="save">Salvar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { rooms as roomsApi } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Rooms are managed from the platform because they cross teams that may have different owners —
 * the same reach as creating a team. Putting one team into an existing room is that team's own
 * business, and lives on TenantsAdminView instead, next to its color and number.
 */
const toast = useToast();

const rooms = ref([]);
const loading = ref(true);
const editing = ref(false);
const form = reactive({ roomId: null, name: '' });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const { data } = await roomsApi.list();
    rooms.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as salas'));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.roomId = null;
  form.name = '';
  editing.value = true;
}

function openEdit(room) {
  form.roomId = room.roomId;
  form.name = room.name;
  editing.value = true;
}

async function save() {
  try {
    if (form.roomId) {
      await roomsApi.rename(form.roomId, { name: form.name.trim() });
    } else {
      await roomsApi.create({ name: form.name.trim() });
    }
    editing.value = false;
    await load();
    toast.success('Sala salva!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a sala'));
  }
}

async function remove(room) {
  if (!window.confirm('Remover a sala ' + room.name + '?')) return;
  try {
    await roomsApi.remove(room.roomId);
    await load();
    toast.info('Sala removida.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover a sala'));
  }
}
</script>
