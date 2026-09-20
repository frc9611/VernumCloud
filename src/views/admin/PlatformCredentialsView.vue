<template>
  <main class="vc-page">
    <div class="vc-stack">
      <h1 class="vc-title vc-title--underlined">Credenciais da plataforma</h1>

      <AlertBanner variant="warning" title="Estas chaves valem para a plataforma inteira">
        Toda equipe que lê uma destas ligas depende da chave cadastrada aqui. Trocar uma vale na hora,
        em todos os servidores, sem reiniciar nada.
      </AlertBanner>

      <p v-if="loading" class="vc-faint">Carregando...</p>

      <div v-else v-for="row in rows" :key="row.kind" class="vc-card">
        <div class="vc-card__header" :class="row.configured ? '' : 'vc-card__header--muted'">
          {{ row.label }}
          <span class="vc-card__icon">{{ row.envVariable }}</span>
        </div>
        <div class="vc-card__body">
          <p>{{ row.description }}</p>

          <div class="vc-row">
            <span :class="['vc-chip', stateChip(row)]">{{ stateText(row) }}</span>
            <span v-if="row.configured" class="vc-chip vc-mono">
              sha256:{{ row.fingerprint }} · {{ row.secretLength }} caracteres
            </span>
            <span v-if="row.origin === 'ENVIRONMENT'" class="vc-chip vc-chip--info">
              vem de {{ row.envVariable }}
            </span>
            <span v-if="!row.configured && row.teamsWaiting" class="vc-chip vc-chip--warning">
              {{ row.teamsWaiting }} equipe(s) esperando
            </span>
          </div>

          <p v-if="row.origin === 'DATABASE' && row.updatedByName" class="vc-small vc-muted">
            Cadastrada por {{ row.updatedByName }} em {{ formatDateTime(row.updatedAt) }}.
          </p>
          <p v-if="row.origin === 'ENVIRONMENT'" class="vc-small vc-muted">
            Nada cadastrado aqui: a plataforma está usando a variável de ambiente. O que for salvo
            nesta tela passa a valer no lugar dela.
          </p>
          <p v-if="row.lastCheckAt" class="vc-small vc-muted">
            Última checagem {{ formatDateTime(row.lastCheckAt) }} em {{ row.lastCheckInstance }}:
            {{ row.lastCheckMessage }}
          </p>
          <p v-if="row.baseUrl" class="vc-small vc-muted vc-mono">Endereço de teste: {{ row.baseUrl }}</p>

          <!-- O formulário só abre quando alguém pede: a chave não é algo que se edita sem querer -->
          <div v-if="editing === row.kind" class="vc-stack editor">
            <div class="vc-field">
              <label class="vc-label" :for="`key-${row.kind}`">Chave</label>
              <input :id="`key-${row.kind}`" class="vc-input vc-mono" type="password"
                     v-model="form.secret" maxlength="200" autocomplete="off" spellcheck="false"
                     placeholder="cole a chave da liga" />
              <p class="vc-small vc-faint">
                Depois de salva ela nunca mais é mostrada. Confira pela impressão digital:
                <code>printf %s "$CHAVE" | sha256sum | cut -c1-8</code>
              </p>
            </div>
            <div class="vc-row">
              <button class="vc-btn" type="button" :disabled="busy || !form.secret.trim()"
                      @click="save(row)">Salvar</button>
              <button class="vc-btn vc-btn--outline" type="button" :disabled="busy || !form.secret.trim()"
                      @click="test(row, true)">Testar sem salvar</button>
              <button class="vc-btn vc-btn--ghost" type="button" @click="editing = null">Cancelar</button>
            </div>
          </div>

          <div v-else class="vc-row">
            <button class="vc-btn vc-btn--small" type="button" @click="openEditor(row)">
              {{ row.origin === 'DATABASE' ? 'Substituir chave' : 'Cadastrar chave' }}
            </button>
            <button v-if="row.configured" class="vc-btn vc-btn--outline vc-btn--small" type="button"
                    :disabled="busy" @click="test(row, false)">Testar agora</button>
            <button v-if="row.origin === 'DATABASE'" class="vc-btn vc-btn--outline vc-btn--small"
                    type="button" :disabled="busy" @click="toggle(row)">
              {{ row.enabled ? 'Desligar' : 'Ligar' }}
            </button>
            <button v-if="row.origin === 'DATABASE' || !row.enabled" class="vc-btn vc-btn--danger vc-btn--small"
                    type="button" :disabled="busy" @click="remove(row)">Remover</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AlertBanner from '@/components/AlertBanner.vue';
import { platformCredentials } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { formatDateTime } from '@/services/time.js';

/*
 * As chaves com que a plataforma fala com as ligas externas.
 *
 * Duas coisas desta tela não são estilo, são consequência do servidor:
 *
 *   - Ela nunca mostra uma chave, porque nenhuma rota devolve uma. O que responde "é a chave certa?"
 *     é a impressão digital com o comprimento — o operador confere do lado dele com sha256sum.
 *     Mostrar os últimos quatro caracteres, que é o costume, seria entregar um pedaço literal do
 *     segredo a toda tela e todo print.
 *   - "Testar agora" responde 200 mesmo quando a liga recusa a chave, porque uma sonda que falhou é
 *     um fato e não um erro. Quem decide a cor do toast é o `ok` do corpo, nunca o código HTTP.
 */
const toast = useToast();

const rows = ref([]);
const loading = ref(true);
const busy = ref(false);
const editing = ref(null);
const form = reactive({ secret: '' });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const { data } = await platformCredentials.list();
    rows.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar as credenciais'));
  } finally {
    loading.value = false;
  }
}

function openEditor(row) {
  form.secret = '';
  editing.value = row.kind;
}

async function save(row) {
  busy.value = true;
  try {
    await platformCredentials.save(row.kind, { secret: form.secret });
    editing.value = null;
    toast.success(`Chave do ${row.label} salva!`);
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao salvar a chave'));
  } finally {
    busy.value = false;
  }
}

/** `dryRun` testa o que está digitado sem salvar — o caminho de quem não quer trocar no escuro. */
async function test(row, dryRun) {
  busy.value = true;
  try {
    const body = dryRun ? { secret: form.secret } : undefined;
    const { data } = await platformCredentials.test(row.kind, body);
    if (data.ok) {
      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
    if (!dryRun) await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível testar a chave'));
  } finally {
    busy.value = false;
  }
}

async function toggle(row) {
  busy.value = true;
  try {
    await platformCredentials.save(row.kind, { enabled: !row.enabled });
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao mudar a credencial'));
  } finally {
    busy.value = false;
  }
}

async function remove(row) {
  busy.value = true;
  try {
    await platformCredentials.remove(row.kind);
    toast.success(row.envAvailable
      ? `Removida. A plataforma volta a usar ${row.envVariable}.`
      : 'Credencial removida.');
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover a credencial'));
  } finally {
    busy.value = false;
  }
}

function stateChip(row) {
  if (!row.configured) return 'vc-chip--warning';
  if (row.lastCheckOk === true) return 'vc-chip--success';
  if (row.lastCheckOk === false) return 'vc-chip--danger';
  return '';
}

function stateText(row) {
  if (!row.enabled) return 'desligada';
  if (!row.configured) return 'não configurada';
  if (row.lastCheckOk === true) return 'a liga aceitou a chave';
  if (row.lastCheckOk === false) return 'a liga recusou a chave';
  return 'nunca testada';
}
</script>

<style scoped>
.editor {
  padding: 12px;
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  background: var(--vc-surface-muted);
}

code {
  font-size: 0.85em;
}
</style>
