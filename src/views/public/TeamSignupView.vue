<template>
  <main class="signup">
    <div class="signup__brand">
      <VernumLogo :size="42" :with-wordmark="false" />
      <h1 class="signup__wordmark">Cadastrar minha <strong>equipe</strong></h1>
    </div>

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
          Preencha os dados e a plataforma analisa o pedido. Você já sai daqui com uma conta e
          acompanha a resposta por ela.
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

              <div class="vc-field">
                <label class="vc-label" for="profile">O que a equipe vai usar</label>
                <select id="profile" v-model="form.featureProfile" class="vc-select">
                  <option v-for="profile in options.featureProfiles" :key="profile.name" :value="profile.name">
                    {{ profile.label }}
                  </option>
                </select>
                <p class="vc-small vc-muted signup__hint">{{ profileHint }}</p>
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
            <router-link class="vc-btn vc-btn--ghost" :to="{ name: 'login' }">
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

const options = reactive({ categories: [], featureProfiles: [], rooms: [] });
const roomMode = ref('new');

const form = reactive({
  visibleName: '',
  teamNumber: '',
  color: '#8864AE',
  competitionCategory: '',
  featureProfile: 'COMPLETE',
  roomId: null,
  requestedRoomName: '',
  message: '',
  username: '',
  password: '',
  name: '',
  email: '',
});

const profileHint = computed(() => {
  const chosen = options.featureProfiles.find((profile) => profile.name === form.featureProfile);
  return chosen ? chosen.description : 'Dá para mudar depois, a qualquer momento.';
});

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
    options.rooms = data.rooms || [];
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
      featureProfile: form.featureProfile || null,
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

@media (max-width: 620px) {
  .signup__pair {
    grid-template-columns: 1fr;
  }
}
</style>
