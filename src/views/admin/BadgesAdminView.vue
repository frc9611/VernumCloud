<template>
  <main class="vc-page vc-page--wide">
    <div class="vc-stack">
      <div class="vc-row vc-row--between">
        <h1 class="vc-title vc-title--underlined">Badges de {{ auth.activeTenantName }}</h1>
        <div class="vc-row">
          <button
            v-if="auth.can('BADGE_GRANT')"
            class="vc-btn"
            type="button"
            :disabled="busy"
            @click="openGrant"
          >
            <AppIcon name="badge" :size="14" />
            Conceder badge
          </button>
        </div>
      </div>

      <p class="vc-faint badges__intro">
        Cada linha é uma condecoração que a equipe concedeu de uma vez a um recorte de gente. O badge
        fica no perfil público de quem recebeu, com o nome da equipe — por isso desfazer apaga os
        badges de todo mundo que a concessão alcançou.
      </p>

      <div class="vc-table-wrap">
        <table class="vc-table">
          <thead>
            <tr>
              <th>Badge</th><th>Recorte</th><th>Quem concedeu</th><th>Alcançou</th>
              <th>Estado</th><th>Quando</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="campaign in campaigns" :key="campaign.campaignId">
              <td class="badges__badge-cell">
                <BadgeChip :badge="campaign" :color="colorOf(campaign)" />
                <span v-if="campaign.description" class="vc-faint badges__description">
                  {{ campaign.description }}
                </span>
              </td>
              <td>
                {{ campaign.audienceLabel }}
                <span v-if="campaign.divisionName" class="vc-chip">{{ campaign.divisionName }}</span>
              </td>
              <td>
                <PersonLink :user-id="campaign.grantedBy?.userId || ''"
                            :name="campaign.grantedByName || campaign.grantedBy?.name || '—'" />
                <span v-if="campaign.fromPlatform" class="vc-chip vc-chip--danger"
                      title="Concedido por quem administra a plataforma, em nome desta equipe">
                  plataforma
                </span>
              </td>
              <td>
                {{ campaign.recipientCount || 0 }}
                <span v-if="campaign.skippedCount" class="vc-faint">· {{ campaign.skippedCount }} de fora</span>
              </td>
              <td>
                <span class="vc-badge" :class="statusClass(campaign)">{{ campaign.statusLabel }}</span>
              </td>
              <td class="vc-faint">{{ formatDateTime(campaign.grantedAt) }}</td>
              <td>
                <div class="badges__actions">
                  <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                          :disabled="busy" @click="openRecipients(campaign)">
                    Quem recebeu
                  </button>
                  <template v-if="auth.can('BADGE_GRANT') && campaign.status !== 'REVOKED'">
                    <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" :disabled="busy"
                            title="Concede aos que entraram na equipe depois, sem repetir em quem já tem"
                            @click="rerun(campaign)">
                      Conceder aos que faltam
                    </button>
                    <button class="vc-btn vc-btn--ghost vc-btn--small" type="button"
                            :disabled="busy" @click="openEdit(campaign)">
                      Corrigir
                    </button>
                    <button class="vc-btn vc-btn--danger vc-btn--small" type="button"
                            :disabled="busy" @click="revoke(campaign)">
                      Desfazer
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!campaigns.length" title="Nenhuma concessão em massa">
          Quando a equipe condecorar um grupo de uma vez, a ocasião fica registrada aqui.
        </EmptyState>
      </div>
    </div>

    <!-- ------------------------------------------------------- grant / correct -->
    <BadgeCampaignDialog
      v-if="dialogOpen"
      :tenant-id="auth.activeTenantId"
      :campaign="editingCampaign"
      @done="load"
      @close="closeDialog"
    />

    <!-- ---------------------------------------------- what "aos que faltam" did -->
    <ModalDialog v-if="rerunResult" wide title="Conceder aos que faltam" @close="rerunResult = null">
      <BadgeGrantResult :result="rerunResult" />
      <template #footer>
        <button class="vc-btn" type="button" @click="rerunResult = null">Fechar</button>
      </template>
    </ModalDialog>

    <!-- ------------------------------------------------------------ recipients -->
    <ModalDialog v-if="recipientsOf" :title="'Quem recebeu ' + recipientsOf.title" @close="recipientsOf = null">
      <p class="vc-faint" style="margin-top: 0">
        Quem tem este badge <strong>agora</strong>: alguém que o removeu do próprio perfil não aparece
        aqui, e é por isso que este número pode ser menor que o do dia da concessão.
      </p>
      <p v-if="loadingRecipients" class="vc-faint" style="margin: 0">Carregando...</p>
      <div v-else-if="recipients.length" class="vc-stack badges__recipients">
        <div v-for="person in recipients" :key="person.userId" class="badges__recipient">
          <PersonLink :user-id="person.userId" :name="person.name" avatar />
          <span class="vc-faint">@{{ person.username }}</span>
        </div>
        <span v-if="recipients.length >= RECIPIENTS_LIMIT" class="vc-faint">
          A lista para nas primeiras {{ RECIPIENTS_LIMIT }} pessoas.
        </span>
      </div>
      <EmptyState v-else title="Ninguém com este badge">
        A concessão foi desfeita, ou todo mundo que recebeu já removeu o badge.
      </EmptyState>
      <template #footer>
        <button class="vc-btn vc-btn--ghost" type="button" @click="recipientsOf = null">Fechar</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PersonLink from '@/components/PersonLink.vue';
import BadgeChip from '@/components/people/BadgeChip.vue';
import BadgeCampaignDialog from '@/components/people/BadgeCampaignDialog.vue';
import BadgeGrantResult from '@/components/people/BadgeGrantResult.vue';
import { formatDateTime } from '@/components/people/profileText.js';
import { authStore } from '@/store/auth.js';
import { badgeCampaigns } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * As condecorações que a equipe concedeu de uma vez.
 *
 * The screen is the receipt of each ocasião and the four things that can still be done to one:
 * reading who holds the badge today, granting to whoever joined afterwards, correcting what the
 * badge says, and taking the whole thing back. Only the last one asks before acting — it deletes a
 * badge from the public profile of everybody the concessão reached, and it cannot be undone from
 * here.
 *
 * `recipientCount` on the row is the picture of the day the concessão ran; "Quem recebeu" asks the
 * server who holds it now. The difference between the two is information — somebody removed the
 * badge by hand — and not an error, so the screen shows both instead of reconciling them.
 */
const auth = authStore();
const toast = useToast();

/** The server stops the recipients list here, so the screen says so instead of implying it is all. */
const RECIPIENTS_LIMIT = 500;

const campaigns = ref([]);
const busy = ref(false);

const dialogOpen = ref(false);
const editingCampaign = ref(null);

const recipientsOf = ref(null);
const recipients = ref([]);
const loadingRecipients = ref(false);

const rerunResult = ref(null);

onMounted(load);
watch(() => auth.activeTenantId, load);

async function load() {
  if (!auth.activeTenantId) return;
  try {
    const { data } = await badgeCampaigns.list(auth.activeTenantId);
    campaigns.value = data;
  } catch (error) {
    campaigns.value = [];
    toast.error(apiMessage(error, 'Erro ao carregar as concessões de badge'));
  }
}

/** The badge's own colour, else the colour of the team that issued it. */
function colorOf(campaign) {
  return campaign.color || auth.activeTenantColor || 'var(--vc-purple)';
}

function statusClass(campaign) {
  if (campaign.status === 'REVOKED') return 'vc-badge--off';
  if (campaign.status === 'RUNNING') return 'vc-badge--purple';
  return 'vc-badge--on';
}

function openGrant() {
  editingCampaign.value = null;
  dialogOpen.value = true;
}

function openEdit(campaign) {
  editingCampaign.value = campaign;
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  editingCampaign.value = null;
}

async function openRecipients(campaign) {
  recipientsOf.value = campaign;
  recipients.value = [];
  loadingRecipients.value = true;
  try {
    const { data } = await badgeCampaigns.recipients(auth.activeTenantId, campaign.campaignId);
    recipients.value = data;
  } catch (error) {
    toast.error(apiMessage(error, 'Não deu para carregar quem recebeu.'));
  } finally {
    loadingRecipients.value = false;
  }
}

/*
 * Concede aos que faltam. No confirmation on purpose: it only ever adds, never removes, and the
 * server skips whoever already holds the badge — pressing it twice grants nothing the second time.
 *
 * The answer opens the same result panel the grant uses, and not a toast, because the server counts
 * everybody who already holds the badge as skipped: a toast saying "200 ficaram de fora" would turn
 * a run where nothing went wrong into an alarm, while the panel says the reason out loud.
 */
async function rerun(campaign) {
  busy.value = true;
  try {
    const { data } = await badgeCampaigns.rerun(auth.activeTenantId, campaign.campaignId);
    rerunResult.value = data;
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível conceder aos que faltam.'));
  } finally {
    busy.value = false;
  }
}

/*
 * Desfazer apaga o badge de todo mundo que a concessão alcançou, mais os avisos dela. É o único
 * botão desta tela que tira algo de muita gente de uma vez, e por isso é o único que pergunta antes.
 */
async function revoke(campaign) {
  const reach = campaign.recipientCount
    ? ` Ele some do perfil de ${campaign.recipientCount} ${campaign.recipientCount === 1 ? 'pessoa' : 'pessoas'}.`
    : '';
  if (!window.confirm(`Desfazer a concessão "${campaign.title}"?${reach} Não dá para voltar atrás.`)) return;
  busy.value = true;
  try {
    await badgeCampaigns.revoke(auth.activeTenantId, campaign.campaignId);
    toast.info('Concessão desfeita.');
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Não foi possível desfazer a concessão.'));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.badges__intro {
  margin: 0;
  max-width: 70ch;
}

/*
 * The chip cuts its own title with an ellipsis when the cell is narrow, and the title is the one
 * thing this table is about — so the column is given room instead of being left to the browser.
 */
.badges__badge-cell {
  min-width: 270px;
}

.badges__description {
  display: block;
  margin-top: 4px;
  max-width: 38ch;
  font-size: 0.78rem;
}

/*
 * Four actions on one line push the table past the page and clip the last of them. They wrap onto a
 * second line instead: a button nobody can see is worse than a row one line taller.
 */
.badges__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.badges__recipients {
  gap: 2px;
  max-height: 420px;
  overflow-y: auto;
}

.badges__recipient {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--vc-border);
}

.badges__recipient:last-child {
  border-bottom: 0;
}
</style>
