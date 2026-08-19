<template>
  <main class="login">
    <div class="login__brand">
      <VernumLogo :size="46" :with-wordmark="false" />
      <h1 class="login__wordmark">Cyber <strong>Login</strong></h1>
    </div>

    <section class="login__card">
      <h2 class="login__title">Entre no <strong>Vernum Cloud</strong></h2>

      <form v-if="!auth.isAuth" @submit.prevent="login">
        <input
          class="vc-input"
          type="text"
          placeholder="Usuário"
          autocomplete="username"
          v-model="credentials.username"
          required
        />

        <div class="login__password">
          <label class="login__floating" for="password">Senha</label>
          <input
            id="password"
            class="vc-input"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            v-model="credentials.password"
            required
          />
          <button
            class="login__eye"
            type="button"
            :aria-label="showPassword ? 'Esconder senha' : 'Mostrar senha'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>

        <div class="login__actions">
          <router-link :to="{ name: 'openProcesses' }" class="login__link">Não se candidatou?</router-link>
          <button class="vc-btn" type="submit" :disabled="busy">{{ busy ? 'Entrando...' : 'Entrar' }}</button>
        </div>
      </form>

      <div v-else class="vc-stack">
        <p class="vc-muted" style="text-align: center; margin: 0">Você já está logado.</p>
        <button class="vc-btn vc-btn--block" type="button" @click="goInside">Ir para o Dashboard</button>
      </div>
    </section>

    <p v-if="serverOffline" class="login__offline">Vernum Server offline. Contate a equipe de P&amp;D.</p>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import VernumLogo from '@/components/VernumLogo.vue';
import { authStore } from '@/store/auth.js';
import { session } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

const toast = useToast();
const router = useRouter();
const auth = authStore();

const credentials = reactive({ username: '', password: '' });
const showPassword = ref(false);
const busy = ref(false);
const serverOffline = ref(false);

verifyServer();

async function verifyServer() {
  try {
    await session.serverInfo();
  } catch (error) {
    serverOffline.value = true;
    toast.error('Vernum Server offline!');
  }
}

async function login() {
  busy.value = true;
  try {
    await auth.login(credentials);
    goInside();
  } catch (error) {
    toast.error(apiMessage(error, 'Usuário ou senha incorretos!'));
  } finally {
    busy.value = false;
  }
}

/*
 * Where to land depends on the teams of the user: the waiting screen when there is
 * none, the chooser when there is more than one and no team was picked yet.
 */
function goInside() {
  if (auth.hasNoTenant) {
    router.push({ name: 'waiting' });
  } else if (!auth.activeTenantId) {
    router.push({ name: 'chooseTenant' });
  } else {
    router.push({ name: 'home' });
  }
}
</script>

<style scoped>
.login {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 40px 20px;
}

.login__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login__wordmark {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 300;
  letter-spacing: -0.02em;
}

.login__wordmark strong {
  font-weight: 700;
}

.login__card {
  width: 100%;
  max-width: 340px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
  padding: 18px 20px 20px;
}

.login__title {
  margin: 0 0 16px;
  text-align: center;
  font-size: 1rem;
  font-weight: 400;
}

.login__title strong {
  font-weight: 700;
}

.login__card form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* The password field of the mockup, with the label cut into the border */
.login__password {
  position: relative;
}

.login__floating {
  position: absolute;
  top: -8px;
  left: 10px;
  padding: 0 5px;
  background: var(--vc-surface);
  font-size: 0.74rem;
  color: var(--vc-text-muted);
}

.login__password .vc-input {
  padding-right: 40px;
}

.login__eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  opacity: 0.6;
}

.login__eye:hover {
  opacity: 1;
}

.login__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
}

.login__link {
  color: var(--vc-purple);
  font-size: 0.9rem;
  text-decoration: underline;
}

.login__offline {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vc-danger-text);
}
</style>
