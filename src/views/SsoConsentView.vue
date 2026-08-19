<template>
  <main class="consent">
    <div class="consent__brand">
      <VernumLogo :size="42" :with-wordmark="false" />
      <h1 class="consent__wordmark">Entrar com o <strong>Vernum</strong></h1>
    </div>

    <section class="consent__card">
      <!-- something is wrong with the request itself -->
      <template v-if="error">
        <AlertBanner variant="danger" icon="alert" title="Não foi possível continuar">
          {{ error }}
        </AlertBanner>
        <router-link class="vc-btn vc-btn--ghost vc-btn--block" :to="{ name: 'home' }">
          Ir para o dashboard
        </router-link>
      </template>

      <template v-else-if="app">
        <header class="consent__app">
          <span class="consent__icon" :style="{ background: app.color || 'var(--vc-purple)' }">
            <AppIcon :name="app.icon || 'link'" :size="22" />
          </span>
          <div>
            <h2 class="consent__title">{{ app.visibleName }}</h2>
            <p class="vc-faint" style="margin: 2px 0 0">
              cadastrado por {{ app.ownerTenantName || 'uma equipe do Vernum' }}
            </p>
          </div>
        </header>

        <p v-if="app.description" class="vc-muted">{{ app.description }}</p>

        <div class="consent__permissions">
          <strong class="vc-small">O que o app vai poder fazer</strong>
          <p v-if="app.unrestricted" class="vc-faint" style="margin: 4px 0 0">
            Agir com as suas permissões, nas equipes que instalaram esse app. Ele não recebe a sua
            senha em momento nenhum.
          </p>
          <ul v-else class="consent__list">
            <li v-for="label in app.scopeLabels" :key="label">{{ label }}</li>
          </ul>
        </div>

        <div v-if="!auth.isAuth" class="vc-stack">
          <AlertBanner variant="info" icon="lock" title="Entre para continuar">
            Você entra no Vernum, e não no app: a senha nunca passa por ele.
          </AlertBanner>
          <router-link class="vc-btn vc-btn--block" :to="{ name: 'login', query: { next: fullPath } }">
            Entrar no Vernum
          </router-link>
        </div>

        <div v-else class="vc-stack">
          <p class="vc-small" style="margin: 0">
            Entrando como <strong>{{ auth.getName }}</strong> ({{ auth.getUsername }}).
          </p>
          <button class="vc-btn vc-btn--block" type="button" :disabled="busy" @click="authorize">
            {{ busy ? 'Autorizando...' : 'Autorizar ' + app.visibleName }}
          </button>
          <button class="vc-btn vc-btn--ghost vc-btn--block" type="button" @click="cancel">Cancelar</button>
        </div>
      </template>

      <p v-else class="vc-faint" style="text-align: center; margin: 0">Carregando o app...</p>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VernumLogo from '@/components/VernumLogo.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import AppIcon from '@/components/AppIcon.vue';
import { authStore } from '@/store/auth.js';
import { sso } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Consent screen of "Entrar com o VernumCloud".
 *
 * The app sends the browser here with its client_id, the address the login has to come
 * back to and, when it keeps no secret, a PKCE challenge. The person logs into the
 * Vernum — never into the app — sees what the app will be able to do and authorizes it.
 * The server answers with the address to go to, carrying a one-time code the app trades
 * for a token on its own side.
 *
 * The query parameters keep the snake_case names of the OAuth flow, because they are
 * written by whoever is integrating the app and that is the spelling they expect.
 */
const auth = authStore();
const route = useRoute();
const router = useRouter();

const app = ref(null);
const error = ref('');
const busy = ref(false);

const clientId = String(route.query.client_id || route.query.clientId || '');
const redirectUri = String(route.query.redirect_uri || route.query.redirectUri || '');
const state = String(route.query.state || '');
const codeChallenge = String(route.query.code_challenge || route.query.codeChallenge || '');
const codeChallengeMethod = String(route.query.code_challenge_method || route.query.codeChallengeMethod || 'S256');

/** Where the login has to come back to, so the person lands on this same screen. */
const fullPath = computed(() => route.fullPath);

load();

async function load() {
  if (!clientId || !redirectUri) {
    error.value = 'O app não informou client_id e redirect_uri.';
    return;
  }
  try {
    const { data } = await sso.app(clientId, redirectUri);
    if (!data.validRedirect) {
      error.value = 'O endereço de retorno não está cadastrado nesse app. '
        + 'Quem administra o app precisa cadastrá-lo antes.';
      return;
    }
    app.value = data;
  } catch (requestError) {
    error.value = apiMessage(requestError, 'App não encontrado.');
  }
}

async function authorize() {
  busy.value = true;
  try {
    const { data } = await sso.authorize({
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
    });
    //Leaving the dashboard on purpose: the code has to reach the app itself
    window.location.href = data.redirectTo;
  } catch (requestError) {
    busy.value = false;
    error.value = apiMessage(requestError, 'Não foi possível autorizar esse app.');
  }
}

function cancel() {
  router.push({ name: 'home' });
}
</script>

<style scoped>
.consent {
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px 16px;
}

.consent__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.consent__wordmark {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 400;
}

.consent__card {
  width: 100%;
  max-width: 460px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow-lg);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.consent__app {
  display: flex;
  align-items: center;
  gap: 12px;
}

.consent__icon {
  width: 42px;
  height: 42px;
  border-radius: var(--vc-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex: none;
}

.consent__title {
  margin: 0;
  font-size: 1.1rem;
}

.consent__permissions {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
  padding: 12px;
}

.consent__list {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 0.88rem;
  color: var(--vc-text-muted);
}
</style>
