<template>
  <main class="vc-page">
    <div class="vc-stack" style="max-width: 460px; margin: 0 auto">
      <h1 class="vc-title vc-title--underlined">Escolha uma <strong>senha</strong></h1>

      <AlertBanner variant="warning" icon="key" title="Sua senha atual foi escolhida por outra pessoa">
        Ela veio na folha de boas-vindas e serve só para este primeiro acesso. Escolha uma senha que
        só você saiba para continuar.
      </AlertBanner>

      <form class="vc-stack" @submit.prevent="save">
        <div class="vc-field">
          <label class="vc-label" for="current">Senha atual</label>
          <input id="current" class="vc-input" type="password" autocomplete="current-password"
                 v-model="form.oldPassword" required />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="next">Senha nova</label>
          <input id="next" class="vc-input" type="password" autocomplete="new-password"
                 v-model="form.password" minlength="8" required />
          <span class="vc-faint">Pelo menos 8 caracteres.</span>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="repeat">Repita a senha nova</label>
          <input id="repeat" class="vc-input" type="password" autocomplete="new-password"
                 v-model="form.repeat" required />
        </div>
        <button class="vc-btn vc-btn--block" type="submit" :disabled="busy">
          {{ busy ? 'Salvando...' : 'Salvar e continuar' }}
        </button>
      </form>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import { authStore } from '@/store/auth.js';
import { users } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * Forced password change.
 *
 * An account created out of a selection process starts with a one-time password that somebody
 * printed on paper. The server marks it as `mustChangePassword`, the router guard sends the
 * person here, and choosing a password clears the mark — which is also what makes the printed
 * one stop working.
 */
const auth = authStore();
const router = useRouter();
const toast = useToast();

const form = reactive({ oldPassword: '', password: '', repeat: '' });
const busy = ref(false);

async function save() {
  if (form.password !== form.repeat) {
    toast.error('As duas senhas novas não são iguais.');
    return;
  }
  busy.value = true;
  try {
    await users.update(auth.getId, { password: form.password, oldPassword: form.oldPassword });
    await auth.loadMe();
    toast.success('Senha alterada!');
    router.push({ name: auth.activeTenantId ? 'home' : 'chooseTenant' });
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível alterar a senha.'));
  } finally {
    busy.value = false;
  }
}
</script>
