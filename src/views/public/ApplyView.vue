<template>
  <main class="apply">
    <div class="apply__brand">
      <VernumLogo :size="42" :with-wordmark="false" />
      <h1 class="apply__wordmark">Cyber <strong>Candidatura</strong></h1>
    </div>

    <p v-if="loading" class="vc-faint">Carregando processo seletivo...</p>

    <AlertBanner v-else-if="notFound" variant="danger" icon="!" title="Link inválido.">
      Esse processo seletivo não existe, não foi publicado ainda ou o link foi renovado.
    </AlertBanner>

    <template v-else>
      <section class="apply__card">
        <header class="apply__header">
          <span>{{ process.tenantName }}</span>
          <span v-if="process.tenantTeamNumber">#{{ process.tenantTeamNumber }}</span>
        </header>

        <div class="apply__body">
          <h2 class="apply__title">{{ process.name }}</h2>
          <p v-if="process.description" class="vc-muted" style="margin: 0">{{ process.description }}</p>

          <p v-if="process.formIntro" class="vc-callout">{{ process.formIntro }}</p>

          <AlertBanner v-if="!process.acceptingEntries" variant="warning" icon="!"
                       :title="process.statusLabel" :aside="deadline">
            As inscrições deste processo não estão abertas neste momento.
          </AlertBanner>

          <AlertBanner v-else-if="sent" variant="success" icon="✓" title="Candidatura enviada!"
                       :aside="linkedToAccount ? 'Ligada à sua conta' : 'Guarde seu e-mail'">
            <template v-if="linkedToAccount">
              Você pode acompanhar o resultado em
              <router-link :to="{ name: 'myApplications' }">minhas candidaturas</router-link>.
            </template>
            <template v-else>
              A equipe entra em contato pelo e-mail informado.
            </template>
          </AlertBanner>

          <!-- Optional login: fills the form from the profile -->
          <div v-else-if="!auth.isAuth" class="apply__login">
            <p class="vc-small" style="margin: 0">
              <strong>Já tem conta no Vernum Cloud?</strong>
              <span style="margin-left: 5px">
                Entre para preencher o formulário automaticamente e acompanhar o resultado por aqui.
              </span>
            </p>
            <form class="vc-row" style="gap: 6px" @submit.prevent="loginAndPrefill">
              <input class="vc-input" style="flex: 1; min-width: 120px" type="text"
                     placeholder="Usuário" v-model="credentials.username" />
              <input class="vc-input" style="flex: 1; min-width: 120px" type="password"
                     placeholder="Senha" v-model="credentials.password" />
              <button class="vc-btn vc-btn--outline" type="submit">Entrar e preencher</button>
            </form>
          </div>

          <div v-else-if="!sent" class="vc-banner vc-banner--info">
            Preenchido com os dados de <strong>&nbsp;{{ auth.getName }}</strong>.
            <span class="vc-banner-aside">A candidatura ficará ligada à sua conta</span>
          </div>

          <form v-if="process.acceptingEntries && !sent" class="vc-stack" @submit.prevent="submit">
            <div class="apply__fields">
              <div class="vc-field">
                <label class="vc-label" for="name">Nome completo *</label>
                <input id="name" class="vc-input" type="text" v-model="form.name" required />
              </div>
              <div class="vc-field">
                <label class="vc-label" for="socialName">Nome social</label>
                <input id="socialName" class="vc-input" type="text" v-model="form.socialName" />
              </div>
            </div>

            <div class="apply__fields">
              <div class="vc-field">
                <label class="vc-label" for="email">E-mail *</label>
                <input id="email" class="vc-input" type="email" v-model="form.email" required />
              </div>
              <div class="vc-field">
                <label class="vc-label" for="phone">Telefone</label>
                <input id="phone" class="vc-input" type="tel" v-model="form.phone" />
              </div>
            </div>

            <div class="apply__fields">
              <div class="vc-field">
                <label class="vc-label" for="birthDate">Data de nascimento</label>
                <input id="birthDate" class="vc-input" type="date" v-model="form.birthDate" />
              </div>
              <div class="vc-field">
                <label class="vc-label" for="schoolYear">Sala e ano</label>
                <input id="schoolYear" class="vc-input" type="text" v-model="form.schoolYear" />
              </div>
            </div>

            <div class="vc-field">
              <label class="vc-label" for="course">Itinerário / curso</label>
              <input id="course" class="vc-input" type="text" v-model="form.course" />
            </div>

            <div v-if="process.divisions.length" class="vc-field">
              <label class="vc-label">
                Divisões de interesse<template v-if="process.requiresDivision"> *</template>
              </label>
              <div class="apply__divisions">
                <label v-for="division in process.divisions" :key="division.divisionId" class="vc-checkbox">
                  <input type="checkbox" :value="division.divisionId" v-model="form.divisionIds" />
                  <span>
                    {{ division.visibleName }}
                    <span v-if="division.description" class="vc-faint" style="display: block">
                      {{ division.description }}
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div class="vc-field">
              <label class="vc-label" for="motivation">Por que você quer entrar na equipe?</label>
              <textarea id="motivation" class="vc-textarea" v-model="form.motivation"></textarea>
            </div>

            <label class="vc-checkbox">
              <input type="checkbox" v-model="form.sesiStudent" />
              Sou estudante da instituição
            </label>

            <label class="vc-checkbox">
              <input type="checkbox" v-model="form.termsAgreement" required />
              Concordo com o uso dos meus dados para o processo seletivo *
            </label>

            <div class="vc-row">
              <button class="vc-btn" type="submit" :disabled="busy">
                {{ busy ? 'Enviando...' : 'Enviar candidatura' }}
              </button>
              <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'openProcesses' }">
                Ver outros processos
              </router-link>
            </div>
          </form>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import VernumLogo from '@/components/VernumLogo.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import { authStore } from '@/store/auth.js';
import { publicRecruitment } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { applyAccent, resetAccent } from '@/services/theme.js';

/*
 * The public application form.
 *
 * It works with no account at all: the endpoints under /public answer without a token.
 * Logging in here is optional and does two things - fills the form from the profile and
 * ties the candidatura to the account, so the person receives the result as a notification.
 */
const route = useRoute();
const toast = useToast();
const auth = authStore();

const token = route.params.token;
const process = ref({ divisions: [] });
const loading = ref(true);
const notFound = ref(false);
const busy = ref(false);
const sent = ref(false);
const linkedToAccount = ref(false);

const credentials = reactive({ username: '', password: '' });
const form = reactive({
  name: '', socialName: '', email: '', phone: '', birthDate: '', course: '', schoolYear: '',
  sesiStudent: false, termsAgreement: false, motivation: '', divisionIds: [],
});

const deadline = computed(() =>
  process.value.endDate ? 'Até ' + new Date(process.value.endDate).toLocaleDateString('pt-BR') : '',
);

onMounted(async () => {
  try {
    const { data } = await publicRecruitment.process(token);
    process.value = data;
    //The form takes the color of the team that opened the process
    applyAccent(data.tenantColor);
  } catch (error) {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
  if (auth.isAuth) {
    await prefill();
  }
});

onUnmounted(resetAccent);

/** Copies the profile of the logged user into the form. */
async function prefill() {
  try {
    const { data } = await publicRecruitment.prefill();
    if (!data) return;
    form.name = data.name || form.name;
    form.email = data.email || form.email;
    form.birthDate = data.birthDate || form.birthDate;
    form.course = data.course || form.course;
    form.schoolYear = data.schoolYear || form.schoolYear;
  } catch (error) {
    //Without the prefill the person simply types the data
  }
}

async function loginAndPrefill() {
  try {
    await auth.login(credentials);
    await prefill();
    toast.success('Dados preenchidos a partir do seu perfil!');
  } catch (error) {
    toast.error(apiMessage(error, 'Usuário ou senha incorretos'));
  }
}

async function submit() {
  if (process.value.requiresDivision && !form.divisionIds.length) {
    toast.warning('Escolha pelo menos uma divisão.');
    return;
  }
  busy.value = true;
  try {
    const { data } = await publicRecruitment.submit(token, {
      ...form,
      birthDate: form.birthDate || null,
    });
    sent.value = true;
    linkedToAccount.value = !!data.linkedToAccount;
    toast.success('Candidatura enviada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao enviar candidatura'));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.apply {
  max-width: 660px;
  margin: 0 auto;
  padding: 40px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.apply__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.apply__wordmark {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 300;
  letter-spacing: -0.02em;
}

.apply__wordmark strong {
  font-weight: 700;
}

.apply__card {
  width: 100%;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
  overflow: hidden;
}

.apply__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: var(--vc-purple);
  color: #fff;
  font-weight: 600;
}

.apply__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.apply__title {
  margin: 0;
  font-size: 1.3rem;
}

.apply__login {
  background: var(--vc-purple-soft);
  border: 1px solid var(--vc-purple-border);
  border-radius: var(--vc-radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.apply__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.apply__divisions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px 14px;
}
</style>
