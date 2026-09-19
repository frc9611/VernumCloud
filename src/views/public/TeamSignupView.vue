<template>
  <main class="signup">
    <!-- A logged member already has the header above; two brands stacked is one too many. -->
    <div v-if="!auth.isAuth" class="signup__brand">
      <VernumLogo :size="42" :with-wordmark="false" />
      <h1 class="signup__wordmark">Cadastrar uma <strong>equipe</strong></h1>
    </div>
    <h1 v-else class="vc-title vc-title--underlined signup__title">Cadastrar uma equipe</h1>

    <p v-if="loading" class="vc-faint">Carregando...</p>

    <template v-else>
      <AlertBanner v-if="sent" variant="success" title="Solicitação enviada!"
                   :aside="accountCreated ? 'Conta criada' : 'Ligada à sua conta'">
        <p style="margin: 0 0 8px">
          A plataforma vai analisar o pedido. Você acompanha a resposta entrando com
          <strong>{{ sentUsername }}</strong>.
        </p>
        <router-link class="vc-btn vc-btn--small" :to="{ name: auth.isAuth ? 'waiting' : 'login' }">
          {{ auth.isAuth ? 'Acompanhar' : 'Entrar agora' }}
        </router-link>
      </AlertBanner>

      <template v-else>
        <p class="vc-muted signup__lead">
          <template v-if="auth.isAuth">
            Preencha os dados e a plataforma analisa o pedido. Aprovada, a equipe entra na sua conta e
            você é a pessoa responsável por ela.
          </template>
          <template v-else>
            Preencha os dados e a plataforma analisa o pedido. Você já sai daqui com uma conta e
            acompanha a resposta por ela.
          </template>
        </p>

        <form class="signup__form vc-stack" @submit.prevent="submit">
          <!-- ------------------------------------------------------------ the team -->
          <section class="vc-card">
            <div class="vc-card__header">A equipe</div>
            <div class="vc-card__body vc-stack">
              <div class="signup__pair">
                <div class="vc-field">
                  <label class="vc-label" for="visibleName">Nome da equipe</label>
                  <input id="visibleName" v-model="form.visibleName" class="vc-input" maxlength="120" required>
                </div>
                <div class="vc-field">
                  <label class="vc-label" for="teamNumber">Número</label>
                  <input id="teamNumber" v-model="form.teamNumber" class="vc-input" maxlength="20"
                         placeholder="opcional">
                </div>
              </div>

              <div class="signup__pair">
                <div class="vc-field">
                  <label class="vc-label" for="category">Competição</label>
                  <select id="category" v-model="form.competitionCategory" class="vc-select" required>
                    <option value="" disabled>Escolha</option>
                    <option v-for="category in options.categories" :key="category.name" :value="category.name">
                      {{ category.label }}
                    </option>
                  </select>
                </div>
                <div class="vc-field">
                  <label class="vc-label" for="color">Cor da equipe</label>
                  <input id="color" v-model="form.color" class="vc-input" type="color">
                </div>
              </div>

            </div>
          </section>

          <!-- -------------------------------------------------------- what it uses -->
          <section class="vc-card">
            <div class="vc-card__header vc-card__header--muted">
              O que a equipe vai usar
              <span class="vc-card__icon">{{ onCount }} de {{ options.features.length }}</span>
            </div>
            <div class="vc-card__body vc-stack">
              <p class="vc-small vc-muted signup__hint">
                Comece por um conjunto pronto e ajuste o que quiser. Nada aqui é definitivo: a equipe
                liga e desliga tudo isso depois, em Recursos da equipe.
              </p>

              <div class="vc-row signup__presets">
                <button v-for="profile in options.featureProfiles" :key="profile.name" type="button"
                        :class="['vc-chip', 'vc-chip--button', { 'vc-chip--purple': matchesPreset(profile) }]"
                        :title="profile.description" @click="applyPreset(profile)">
                  {{ profile.label }}
                </button>
              </div>

              <div v-for="feature in options.features" :key="feature.name" class="vc-switch">
                <div class="vc-switch__body">
                  <strong>{{ feature.label }}</strong>
                  <p>{{ feature.description }}</p>
                </div>
                <button type="button"
                        :class="['vc-switch__toggle', enabled[feature.name] ? 'is-on' : '']"
                        :aria-pressed="enabled[feature.name] ? 'true' : 'false'"
                        @click="enabled[feature.name] = !enabled[feature.name]">
                  <AppIcon :name="enabled[feature.name] ? 'toggleOn' : 'toggleOff'" :size="18" />
                  {{ enabled[feature.name] ? 'Ligado' : 'Desligado' }}
                </button>
              </div>
            </div>
          </section>

          <!-- ------------------------------------------------------------ the room -->
          <section class="vc-card">
            <div class="vc-card__header vc-card__header--muted">Onde a equipe se encontra</div>
            <div class="vc-card__body">
              <div class="signup__room">
                <label class="vc-checkbox">
                  <input v-model="roomMode" type="radio" value="existing" :disabled="!options.rooms.length">
                  Uma sala que já existe
                </label>
                <div v-if="roomMode === 'existing'" class="signup__room-open">
                  <select v-model="form.roomId" class="vc-select">
                    <option :value="null">Sem sala definida</option>
                    <option v-for="room in options.rooms" :key="room.roomId" :value="room.roomId">
                      {{ room.name }}
                    </option>
                  </select>
                </div>

                <label class="vc-checkbox">
                  <input v-model="roomMode" type="radio" value="new">
                  Pedir uma sala nova
                </label>
                <div v-if="roomMode === 'new'" class="signup__room-open">
                  <input v-model="form.requestedRoomName" class="vc-input" maxlength="80"
                         placeholder="Nome da sala">
                  <p class="vc-small vc-muted signup__hint">
                    A sala é criada junto com a equipe, se o pedido for aprovado.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- ----------------------------------------------------------- the person -->
          <section class="vc-card">
            <div class="vc-card__header vc-card__header--muted">Você</div>
            <div class="vc-card__body vc-stack">
              <p class="vc-small vc-muted signup__hint">
                Aprovada a equipe, esta conta é a administradora dela.
              </p>

              <p v-if="auth.isAuth" class="vc-callout">
                Você já está em uma conta: a solicitação fica ligada a
                <strong>{{ auth.user?.username }}</strong>.
              </p>

              <template v-else>
                <div class="signup__pair">
                  <div class="vc-field">
                    <label class="vc-label" for="name">Seu nome</label>
                    <input id="name" v-model="form.name" class="vc-input" maxlength="120" required>
                  </div>
                  <div class="vc-field">
                    <label class="vc-label" for="email">E-mail</label>
                    <input id="email" v-model="form.email" class="vc-input" type="email" maxlength="120">
                  </div>
                </div>
                <div class="signup__pair">
                  <div class="vc-field">
                    <label class="vc-label" for="username">Nome de acesso</label>
                    <input id="username" v-model="form.username" class="vc-input" maxlength="60" required>
                  </div>
                  <div class="vc-field">
                    <label class="vc-label" for="password">Senha</label>
                    <input id="password" v-model="form.password" class="vc-input" type="password"
                           minlength="8" required>
                    <p class="vc-small vc-muted signup__hint">Pelo menos 8 caracteres.</p>
                  </div>
                </div>
              </template>

              <div class="vc-field">
                <label class="vc-label" for="message">Recado para quem analisa</label>
                <textarea id="message" v-model="form.message" class="vc-textarea" rows="3" maxlength="2000"
                          placeholder="A escola, quantas pessoas, o contato de vocês."></textarea>
              </div>
            </div>
          </section>

          <div class="vc-row">
            <router-link class="vc-btn vc-btn--ghost" :to="{ name: backTarget }">
              {{ auth.isAuth ? 'Voltar' : 'Já tenho conta' }}
            </router-link>
            <span class="vc-spacer"></span>
            <button class="vc-btn" type="submit" :disabled="saving">
              {{ saving ? 'Enviando...' : 'Enviar solicitação' }}
            </button>
          </div>
        </form>
      </template>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import VernumLogo from '@/components/VernumLogo.vue';
import { teamSignup } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { authStore } from '@/store/auth.js';
import { useToast } from 'vue-toastification';

/*
 * The public door of the platform: a team asking to exist.
 *
 * It answers without a login on purpose — whoever is filling it in has no account and no team, which
 * is exactly what they are asking for. Somebody who does arrive logged in keeps their account: the
 * server ties the request to the token and the fields of the person disappear from the form.
 *
 * The screen never creates a team. It writes a request, and the platform decides.
 */
const auth = authStore();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const sent = ref(false);
const sentUsername = ref('');
const accountCreated = ref(false);

const options = reactive({ categories: [], featureProfiles: [], features: [], rooms: [] });
const roomMode = ref('new');
/* One entry per feature the server offers — what is not offered is never asked for. */
const enabled = reactive({});

const form = reactive({
  visibleName: '',
  teamNumber: '',
  color: '#8864AE',
  competitionCategory: '',
  roomId: null,
  requestedRoomName: '',
  message: '',
  username: '',
  password: '',
  name: '',
  email: '',
});

const onCount = computed(() => options.features.filter((feature) => enabled[feature.name]).length);

/* Somebody logged in but with no team belongs on the waiting screen, not on a dashboard they have none of. */
const backTarget = computed(() => {
  if (!auth.isAuth) return 'login';
  return auth.memberships.length ? 'home' : 'waiting';
});

/** True when the switches say exactly what this preset says, so the chip can show which one is on. */
function matchesPreset(profile) {
  return options.features.every(
    (feature) => !!enabled[feature.name] === profile.features.includes(feature.name),
  );
}

function applyPreset(profile) {
  for (const feature of options.features) {
    enabled[feature.name] = profile.features.includes(feature.name);
  }
}

//The two ways of answering the room exclude each other, and the server refuses both at once
watch(roomMode, (mode) => {
  if (mode === 'existing') form.requestedRoomName = '';
  else form.roomId = null;
});

onMounted(async () => {
  try {
    const { data } = await teamSignup.options();
    options.categories = data.categories || [];
    options.featureProfiles = data.featureProfiles || [];
    options.features = data.features || [];
    options.rooms = data.rooms || [];
    //Everything on is what a team created by hand gets, so it is where this form starts too
    for (const feature of options.features) enabled[feature.name] = true;
    if (options.rooms.length) roomMode.value = 'existing';
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível carregar o formulário.'));
  } finally {
    loading.value = false;
  }
});

async function submit() {
  saving.value = true;
  try {
    const body = {
      visibleName: form.visibleName,
      teamNumber: form.teamNumber || null,
      color: form.color || null,
      competitionCategory: form.competitionCategory,
      features: Object.fromEntries(options.features.map((f) => [f.name, !!enabled[f.name]])),
      roomId: roomMode.value === 'existing' ? form.roomId : null,
      requestedRoomName: roomMode.value === 'new' ? form.requestedRoomName : null,
      message: form.message || null,
    };
    //Only a visitor sends an account; a logged person already is one
    if (!auth.isAuth) {
      body.username = form.username;
      body.password = form.password;
      body.name = form.name;
      body.email = form.email || null;
    }
    const { data } = await teamSignup.submit(body);
    sentUsername.value = data.username;
    accountCreated.value = data.accountCreated;
    sent.value = true;
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível enviar a solicitação.'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.signup {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.signup__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.signup__wordmark {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 300;
  letter-spacing: -0.02em;
}

.signup__wordmark strong {
  font-weight: 700;
}

.signup__lead {
  margin: 0;
  text-align: center;
}

.signup__title {
  align-self: stretch;
  margin: 0;
}

.signup__form {
  width: 100%;
}

.signup__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.signup__room {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signup__room-open {
  padding-left: 26px;
}

.signup__hint {
  margin: 6px 0 0;
}

.signup__presets {
  flex-wrap: wrap;
}

@media (max-width: 620px) {
  .signup__pair {
    grid-template-columns: 1fr;
  }
}
</style>
