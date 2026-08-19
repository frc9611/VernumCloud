<template>
  <main class="vc-page">
    <div class="vc-stack" style="max-width: 560px">
      <h1 class="vc-title vc-title--underlined">Cadastrar usuário</h1>

      <AlertBanner variant="info" icon="i" title="Conta nova." :aside="auth.activeTenantName">
        A pessoa já entra em {{ auth.activeTenantName }} com o cargo escolhido. Peça para trocar a senha
        no primeiro acesso.
      </AlertBanner>

      <form class="vc-stack" @submit.prevent="create" autocomplete="off">
        <div class="vc-field">
          <label class="vc-label" for="name">Nome completo</label>
          <input id="name" class="vc-input" type="text" v-model="form.name" @change="suggestUsername" required />
        </div>

        <div class="vc-field">
          <label class="vc-label" for="username">Usuário</label>
          <input id="username" class="vc-input" type="text" v-model="form.username" required />
        </div>

        <div class="vc-field">
          <label class="vc-label" for="password">Senha inicial</label>
          <input id="password" class="vc-input" type="password" v-model="form.password" required />
        </div>

        <div class="vc-field">
          <label class="vc-label" for="email">E-mail</label>
          <div class="vc-input-group">
            <input id="email" class="vc-input" type="email" v-model="form.email" />
            <button class="vc-btn vc-btn--ghost" type="button" @click="appendDomain">
              @estudante.sesisenai.org.br
            </button>
          </div>
        </div>

        <div class="vc-row" style="gap: 14px; align-items: flex-start">
          <div class="vc-field" style="flex: 1">
            <label class="vc-label" for="birthDate">Data de nascimento</label>
            <input id="birthDate" class="vc-input" type="date" v-model="form.birthDate" />
          </div>
          <div class="vc-field" style="flex: 1">
            <label class="vc-label" for="schoolClass">Sala e ano</label>
            <input id="schoolClass" class="vc-input" type="text" v-model="form.schoolClass" />
          </div>
        </div>

        <div class="vc-field">
          <label class="vc-label" for="course">Itinerário</label>
          <input id="course" class="vc-input" type="text" v-model="form.course" placeholder="Curso Técnico em..." />
        </div>

        <div class="vc-row" style="gap: 14px; align-items: flex-start">
          <div class="vc-field" style="flex: 1">
            <label class="vc-label" for="role">Cargo na equipe</label>
            <select id="role" class="vc-select" v-model="form.role">
              <option v-for="role in roles" :key="role.name" :value="role.name">{{ role.label }}</option>
            </select>
          </div>
          <div class="vc-field" style="flex: 1">
            <label class="vc-label" for="division">Divisão inicial</label>
            <select id="division" class="vc-select" v-model="form.divisionId">
              <option :value="null">Nenhuma</option>
              <option v-for="division in divisionList" :key="division.divisionId" :value="division.divisionId">
                {{ division.visibleName }}
              </option>
            </select>
          </div>
        </div>

        <div class="vc-field" v-if="form.divisionId">
          <label class="vc-label" for="position">Cargo na divisão</label>
          <input id="position" class="vc-input" type="text" v-model="form.position" placeholder="Programador, Mentor..." />
        </div>

        <div class="vc-row">
          <button class="vc-btn" type="submit" :disabled="busy">Cadastrar</button>
          <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'adminMembers' }">Cancelar</router-link>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import { authStore } from '@/store/auth.js';
import { catalogs, divisions, users } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

const auth = authStore();
const router = useRouter();
const toast = useToast();

const roles = ref([]);
const divisionList = ref([]);
const busy = ref(false);

const form = reactive({
  name: '', username: '', password: '', email: '', birthDate: '', schoolClass: '', course: '',
  role: 'MEMBER', divisionId: null, position: '',
});

onMounted(async () => {
  try {
    const [rolesResponse, divisionsResponse] = await Promise.all([
      catalogs.membershipRoles(),
      divisions.list(auth.activeTenantId),
    ]);
    roles.value = rolesResponse.data;
    divisionList.value = divisionsResponse.data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar dados da equipe'));
  }
});

/** Suggests firstname + lastname as the username, like the old screen did. */
function suggestUsername() {
  const parts = form.name.toLowerCase().trim().split(/\s+/);
  if (parts.length) {
    form.username = parts[0] + (parts.length > 1 ? parts[parts.length - 1] : '');
  }
}

function appendDomain() {
  if (form.email && !form.email.includes('@')) {
    form.email = form.email + '@estudante.sesisenai.org.br';
  }
}

async function create() {
  busy.value = true;
  try {
    await users.create({
      ...form,
      birthDate: form.birthDate || null,
      tenantId: auth.activeTenantId,
      divisionId: form.divisionId || null,
    });
    toast.success('Usuário cadastrado!');
    router.push({ name: 'adminMembers' });
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao cadastrar usuário'));
  } finally {
    busy.value = false;
  }
}
</script>
