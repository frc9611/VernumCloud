<template>
  <section class="vc-stack pteams">
    <SectionTitle title="Equipes">
      <template #actions>
        <span class="vc-faint">{{ visible.length }} {{ visible.length === 1 ? 'equipe' : 'equipes' }}</span>
      </template>
    </SectionTitle>

    <p v-if="customizing" class="vc-faint" style="margin: 0">
      O olho decide se uma equipe aparece no seu perfil público. Ocultar uma equipe não muda nada nela —
      só o que esta página mostra.
    </p>

    <EmptyState v-if="!visible.length" title="Sem equipe no momento">
      <template v-if="hasHistory">A história desta pessoa está logo abaixo.</template>
      <template v-else>Quando entrar numa equipe, ela aparece aqui.</template>
    </EmptyState>

    <ul v-else class="pteams__list">
      <li
        v-for="membership in visible"
        :key="membership.tenantId"
        :class="['pteams__row', membership.hidden ? 'is-hidden' : '']"
        :style="{ '--team-color': membership.color || 'var(--vc-purple)' }"
      >
        <span class="pteams__logo" aria-hidden="true"></span>

        <div class="pteams__main">
          <div class="pteams__head">
            <strong class="pteams__team">{{ membership.tenantName }}</strong>
            <span v-if="membership.teamNumber" class="vc-faint">#{{ membership.teamNumber }}</span>
            <span class="vc-badge vc-badge--purple">{{ label(membership) }}</span>
            <span v-if="membership.staff" class="vc-chip">conduz a equipe</span>
            <span v-if="membership.hidden" class="vc-chip">oculta</span>
          </div>
          <p class="vc-faint pteams__since">Desde {{ formatDate(membership.joinedAt) }}</p>

          <!-- --------------------------------------------------- trajectory -->
          <ul v-if="membership.trajectory.length" class="pteams__trajectory">
            <li v-for="entry in membership.trajectory" :key="entry.entryId" class="pteams__entry">
              <span class="pteams__entry-dot" aria-hidden="true"></span>
              <span class="pteams__entry-text">
                <strong>{{ entry.roleLabel }}</strong>
                <span class="vc-faint">{{ formatRange(entry.startDate, entry.endDate, true) }}</span>
                <span v-if="entry.status !== 'APPROVED'" :class="['vc-chip', entry.status === 'REJECTED' ? 'vc-chip--danger' : '']">
                  {{ entry.statusLabel }}
                </span>
                <span v-if="entry.note" class="pteams__entry-note">{{ entry.note }}</span>
              </span>
              <span class="vc-row pteams__entry-tools">
                <template v-if="entry.canReview">
                  <button class="vc-btn vc-btn--small" type="button" @click="$emit('review-trajectory', { entry, approve: true })">
                    Aprovar
                  </button>
                  <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('review-trajectory', { entry, approve: false })">
                    Recusar
                  </button>
                </template>
                <button v-if="entry.canEdit" class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="$emit('remove-trajectory', entry)">
                  <AppIcon name="trash" :size="12" />
                </button>
              </span>
            </li>
          </ul>

          <!-- ------------------------------------------------- add a position -->
          <button
            v-if="canEditProfile && addingFor !== membership.tenantId"
            class="pteams__add-toggle"
            type="button"
            @click="startAdding(membership.tenantId)"
          >
            <AppIcon name="plus" :size="12" />
            Adicionar função anterior
          </button>
          <form v-else-if="addingFor === membership.tenantId" class="pteams__add-form" @submit.prevent="submitAdd(membership.tenantId)">
            <p class="vc-faint" style="margin: 0">
              Fica pendente até um mentor ou administrador de {{ membership.tenantName }} confirmar.
            </p>
            <div class="pteams__fields">
              <div class="vc-field">
                <label class="vc-label" for="traj-role">Cargo ou função</label>
                <input id="traj-role" class="vc-input" type="text" v-model="addForm.roleLabel" maxlength="120" placeholder="Projetista, Líder de Engenharia..." />
              </div>
              <div class="vc-field">
                <label class="vc-label" for="traj-note">Observação</label>
                <input id="traj-note" class="vc-input" type="text" v-model="addForm.note" maxlength="500" placeholder="opcional" />
              </div>
            </div>
            <div class="pteams__fields">
              <div class="vc-field">
                <label class="vc-label" for="traj-start">Início</label>
                <input id="traj-start" class="vc-input" type="date" v-model="addForm.startDate" />
              </div>
              <div class="vc-field">
                <label class="vc-label" for="traj-end">Fim</label>
                <input id="traj-end" class="vc-input" type="date" v-model="addForm.endDate" />
              </div>
            </div>
            <div class="vc-row">
              <button class="vc-btn vc-btn--small" type="submit" :disabled="!addForm.roleLabel.trim()">Enviar</button>
              <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="addingFor = null">Cancelar</button>
            </div>
          </form>
        </div>

        <div class="pteams__actions">
          <button
            v-if="customizing"
            class="vc-btn vc-btn--ghost vc-btn--small"
            type="button"
            @click="$emit('toggle-hidden', membership)"
          >
            <AppIcon :name="membership.hidden ? 'eye' : 'eyeOff'" :size="14" />
            {{ membership.hidden ? 'Mostrar' : 'Ocultar' }}
          </button>
          <span v-else-if="membership.tenantId === auth.activeTenantId" class="vc-faint">equipe aberta agora</span>
          <button
            v-else-if="auth.membershipOn(membership.tenantId)"
            class="vc-btn vc-btn--ghost vc-btn--small"
            type="button"
            @click="openTeam(membership.tenantId)"
          >
            Abrir
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionTitle from '@/components/SectionTitle.vue';
import { authStore } from '@/store/auth.js';
import { formatDate, formatRange, membershipLabel } from './profileText.js';

/*
 * The teams the person is in today, one row each — LinkedIn's "experience" list, not a grid of
 * cards: a team's name, the position, since when, and the trajectory of positions held while still
 * inside it. Every team gets its own row, never collapsed, so somebody in a dozen teams reads as a
 * dozen rows instead of a number.
 *
 * The trajectory is the one part of the profile the subject cannot write alone: an entry they add
 * starts pending, shown to them and to whoever could review it, and only a mentor or administrator
 * of that same team turns it into history (`canReview`/`canEdit` come from the server, per entry).
 *
 * A team the owner hid is left out unless `customizing` is on, which is also when the eye toggle to
 * hide or show it appears — a stranger never receives a hidden one at all, so this component never
 * has to hide anything on its own.
 */
const props = defineProps({
  memberships: { type: Array, default: () => [] },
  hasHistory: { type: Boolean, default: false },
  customizing: { type: Boolean, default: false },
  canEditProfile: { type: Boolean, default: false },
});
const emit = defineEmits(['toggle-hidden', 'add-trajectory', 'review-trajectory', 'remove-trajectory']);

const auth = authStore();
const router = useRouter();

const visible = computed(() => (props.customizing ? props.memberships : props.memberships.filter((membership) => !membership.hidden)));

function label(membership) {
  return membershipLabel(membership);
}

function openTeam(tenantId) {
  auth.setActiveTenant(tenantId);
  router.push({ name: 'home' });
}

/* ------------------------------------------------------------- add a position */

const addingFor = ref(null);
const addForm = reactive({ roleLabel: '', note: '', startDate: '', endDate: '' });

function startAdding(tenantId) {
  addForm.roleLabel = '';
  addForm.note = '';
  addForm.startDate = '';
  addForm.endDate = '';
  addingFor.value = tenantId;
}

function submitAdd(tenantId) {
  const body = {
    roleLabel: addForm.roleLabel.trim(),
    note: addForm.note.trim() || null,
    startDate: addForm.startDate || null,
    endDate: addForm.endDate || null,
  };
  addingFor.value = null;
  emit('add-trajectory', { tenantId, body });
}
</script>

<style scoped>
.pteams__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pteams__row {
  display: flex;
  gap: 14px;
  padding: 16px 4px;
  border-bottom: 1px solid var(--vc-border);
}

.pteams__row:last-child {
  border-bottom: 0;
}

.pteams__row.is-hidden {
  opacity: 0.6;
}

.pteams__logo {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  margin-top: 2px;
  background: color-mix(in srgb, var(--team-color) 22%, var(--vc-surface));
  border: 2px solid var(--team-color);
}

.pteams__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pteams__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pteams__team {
  font-size: 1rem;
}

.pteams__since {
  margin: 0;
}

.pteams__actions {
  flex: none;
  display: flex;
  align-items: center;
}

.pteams__trajectory {
  list-style: none;
  margin: 6px 0 0;
  padding: 0 0 0 14px;
  border-left: 2px solid var(--vc-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pteams__entry {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pteams__entry-dot {
  position: absolute;
  left: -18px;
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--team-color);
}

.pteams__entry-text {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.pteams__entry-note {
  color: var(--vc-text-muted);
  font-size: 0.85rem;
  width: 100%;
}

.pteams__entry-tools {
  flex: none;
}

.pteams__add-toggle {
  appearance: none;
  align-self: flex-start;
  margin-top: 4px;
  border: 0;
  background: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 0.8rem;
  color: var(--vc-purple-strong);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.pteams__add-form {
  margin-top: 6px;
  padding: 10px;
  border: 1px dashed var(--vc-border-strong);
  border-radius: var(--vc-radius);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pteams__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

@media (max-width: 700px) {
  .pteams__row {
    flex-direction: column;
  }

  .pteams__actions {
    align-self: flex-start;
  }
}
</style>
