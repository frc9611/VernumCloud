<template>
  <main class="vc-page profile">
    <div class="profile__left">
      <div class="profile__picture">
        <img v-if="pictureUrl" :src="pictureUrl" alt="Foto de perfil" />
        <div v-else class="profile__picture-empty" aria-hidden="true"></div>
        <label class="profile__change">
          <AppIcon name="camera" :size="15" />
          Alterar
          <input type="file" accept="image/*" @change="uploadPicture" />
        </label>
      </div>
    </div>

    <div class="profile__right">
      <h1 class="vc-title vc-title--underlined">{{ auth.getName }}</h1>

      <!-- ------------------------------------------------ teams and divisions -->
      <SectionTitle lead="Cyber" title="Dados" />

      <div v-for="membership in auth.memberships" :key="membership.membershipId" class="profile__tenant">
        <div class="profile__tenant-mark">
          <span class="profile__tenant-dot" :style="{ background: membership.tenant.color || '#8864AE' }"></span>
          <button
            type="button"
            class="profile__tenant-name"
            :class="{ 'is-active': membership.tenant.tenantId === auth.activeTenantId }"
            @click="switchTenant(membership.tenant.tenantId)"
          >
            {{ membership.tenant.visibleName }}
          </button>
        </div>

        <div class="profile__tenant-body">
          <p class="profile__label">Subdivisões:</p>
          <div class="vc-row">
            <span
              v-for="division in membership.divisions"
              :key="division.divisionMembershipId"
              class="vc-chip vc-chip--purple"
              :title="division.position || 'Sem cargo definido'"
            >
              {{ division.divisionVisibleName }}
              <template v-if="division.position"> · {{ division.position }}</template>
              <AppIcon v-if="division.leader" name="shield" :size="12" />
            </span>
            <span v-if="!membership.divisions.length" class="vc-faint">Nenhuma divisão ainda.</span>
            <router-link
              v-if="membership.tenant.tenantId === auth.activeTenantId && auth.can('DIVISION_VIEW')"
              class="vc-chip vc-chip--button"
              :to="{ name: 'divisions' }"
            >+</router-link>
          </div>

          <p class="profile__label" style="margin-top: 10px">Role</p>
          <div class="vc-row">
            <span class="vc-chip vc-chip--purple">{{ membership.roleLabel }}</span>
            <span v-if="membership.tenant.systemTenant" class="vc-chip vc-chip--warning">Administração</span>
            <button class="vc-chip vc-chip--button" type="button" @click="showPermissions = membership">
              <AppIcon name="key" :size="13" />
              Permissões
            </button>
          </div>
        </div>
      </div>

      <p v-if="!auth.memberships.length" class="vc-faint">
        Você ainda não faz parte de nenhuma equipe.
        <router-link :to="{ name: 'waiting' }">Ver processos seletivos abertos</router-link>.
      </p>

      <!-- ------------------------------------------------------ personal data -->
      <SectionTitle lead="Dados" title="Importantes" />

      <p class="vc-callout">
        <strong>Atenção:</strong> esses dados ajudam os mentores do time a identificar o competidor no
        ambiente da instituição. Procure sempre mantê-los atualizados.
      </p>

      <form class="profile__form" @submit.prevent="save">
        <div class="profile__fields">
          <div class="vc-field">
            <label class="vc-label" for="course">Itinerário:</label>
            <input id="course" class="vc-input" type="text" v-model="form.course" placeholder="Curso Técnico em..." />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="schoolClass">Sala e Ano:</label>
            <input id="schoolClass" class="vc-input" type="text" v-model="form.schoolClass" placeholder="GETIC2024 | 3ºAno" />
          </div>
        </div>

        <div class="vc-field">
          <label class="vc-label" for="email">E-mail de Estudante:</label>
          <div class="vc-input-group">
            <input id="email" class="vc-input" type="email" v-model="form.email" />
            <button class="vc-btn vc-btn--icon vc-btn--ghost" type="button" title="Copiar"
                    @click="copy(form.email)">
              <AppIcon name="copy" :size="16" />
            </button>
          </div>
        </div>

        <div class="profile__fields">
          <div class="vc-field">
            <label class="vc-label" for="username">Nome de usuário:</label>
            <input id="username" class="vc-input" type="text" v-model="form.username" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="birthDate">Data de nascimento:</label>
            <input id="birthDate" class="vc-input" type="date" v-model="form.birthDate" />
          </div>
        </div>

        <div class="vc-row">
          <button class="vc-btn" type="submit" :disabled="saving">
            <AppIcon name="edit" :size="16" />
            Salvar Alterações
          </button>
          <button class="vc-btn vc-btn--danger" type="button" @click="auth.clear()">
            <AppIcon name="power" :size="16" />
            Logout
          </button>
        </div>
      </form>

      <!-- ---------------------------------------------------------- rfid tags -->
      <SectionTitle lead="Meu" title="Cartão" />

      <AlertBanner variant="info" icon="card" title="O mesmo cartão vale em todas as suas equipes">
        Um cartão é seu, e não de uma equipe: encostá-lo no leitor da sala marca a sua presença em
        todas as equipes de que você participa. Para cadastrar um cartão novo, encoste-o no leitor de
        cadastro — o número não se digita aqui de propósito, para ninguém registrar um cartão alheio.
      </AlertBanner>

      <div v-if="tags.length" class="profile__cards">
        <div v-for="tag in tags" :key="tag.rfidTagId" class="profile__card">
          <div>
            <strong>{{ tag.visibleName }}</strong>
            <span class="vc-chip">final {{ tag.uidSuffix }}</span>
            <span class="vc-faint" style="display: block">
              Último uso: {{ tag.lastUsedAt ? formatWhen(tag.lastUsedAt) : 'nunca' }}
            </span>
          </div>
          <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removeTag(tag)">
            Remover
          </button>
        </div>
      </div>
      <p v-else class="vc-faint">Você ainda não tem nenhum cartão cadastrado.</p>

      <SectionTitle lead="Alterar" title="Senha" />
      <form class="profile__form" @submit.prevent="changePassword">
        <div class="profile__fields">
          <div class="vc-field">
            <label class="vc-label" for="oldPassword">Senha atual:</label>
            <input id="oldPassword" class="vc-input" type="password" v-model="passwords.oldPassword" />
          </div>
          <div class="vc-field">
            <label class="vc-label" for="newPassword">Senha nova:</label>
            <input id="newPassword" class="vc-input" type="password" v-model="passwords.password" />
          </div>
        </div>
        <div>
          <button class="vc-btn vc-btn--outline" type="submit">Redefinir senha</button>
        </div>
      </form>
    </div>

    <ModalDialog v-if="showPermissions" :title="'Permissões em ' + showPermissions.tenant.visibleName"
                 @close="showPermissions = null">
      <p class="vc-faint" style="margin: 0">
        Cargo {{ showPermissions.roleLabel }}. Somente quem tem PERMISSION_MANAGE na equipe pode alterar
        essa lista.
      </p>
      <div class="vc-row">
        <span v-for="permission in showPermissions.permissions" :key="permission" class="vc-chip">{{ permission }}</span>
      </div>
    </ModalDialog>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import SectionTitle from '@/components/SectionTitle.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import AppIcon from '@/components/AppIcon.vue';
import AlertBanner from '@/components/AlertBanner.vue';
import { authStore } from '@/store/auth.js';
import { rfid, users } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';

/*
 * The profile screen of the mockup: the picture on the left, and on the right the teams
 * of the user with the divisions and cargo of each one, then the personal data.
 */
const auth = authStore();
const toast = useToast();

const pictureUrl = ref(null);
const saving = ref(false);
const showPermissions = ref(null);
const tags = ref([]);

const form = reactive({ username: '', email: '', birthDate: '', schoolClass: '', course: '' });
const passwords = reactive({ oldPassword: '', password: '' });

onMounted(async () => {
  await loadProfile();
  await loadPicture();
  await loadTags();
});

async function loadProfile() {
  try {
    const { data } = await users.get(auth.getId);
    form.username = data.username || '';
    form.email = data.email || '';
    form.birthDate = data.birthDate || '';
    form.schoolClass = data.schoolClass || '';
    form.course = data.course || '';
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao carregar perfil'));
  }
}

async function loadPicture() {
  try {
    const { data } = await users.picture(auth.getId);
    pictureUrl.value = URL.createObjectURL(data);
  } catch (error) {
    pictureUrl.value = null;
  }
}

/*
 * The cards are not gated by a permission or by a feature: a card belongs to the person,
 * it reaches whatever team of theirs has a reader, and somebody who is in no team at all
 * still gets to see and remove the ones they carry.
 */
async function loadTags() {
  try {
    const { data } = await rfid.myTags();
    tags.value = data;
  } catch (error) {
    tags.value = [];
  }
}

async function removeTag(tag) {
  if (!window.confirm(`Remover o cartão "${tag.visibleName}"? Ele para de funcionar em todas as suas equipes.`)) {
    return;
  }
  try {
    await rfid.removeTag(tag.rfidTagId);
    //Only the list changes: no team, division or permission was touched
    await loadTags();
    toast.success('Cartão removido.');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover o cartão'));
  }
}

function formatWhen(value) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function save() {
  saving.value = true;
  try {
    await users.update(auth.getId, { ...form });
    await auth.loadMe();
    toast.success('Perfil atualizado!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar perfil'));
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (!passwords.password) {
    toast.warning('Informe a senha nova.');
    return;
  }
  try {
    await users.update(auth.getId, { ...passwords });
    passwords.oldPassword = '';
    passwords.password = '';
    toast.success('Senha alterada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Alteração de senha não autorizada'));
  }
}

async function uploadPicture(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await users.uploadPicture(auth.getId, file);
    await loadPicture();
    toast.success('Foto atualizada!');
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao atualizar foto'));
  }
}

function switchTenant(tenantId) {
  auth.setActiveTenant(tenantId);
  toast.info('Equipe ativa alterada.');
}

async function copy(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success('Copiado!');
  } catch (error) {
    toast.warning('Copie manualmente: ' + value);
  }
}
</script>

<style scoped>
.profile__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.profile__card .vc-chip {
  margin-left: 8px;
}

.profile__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
}

.profile {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 34px;
  align-items: start;
}

.profile__picture {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: #e2e2e6;
}

.profile__picture img,
.profile__picture-empty {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile__change {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border-strong);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.82rem;
  cursor: pointer;
  white-space: nowrap;
}

.profile__change input {
  display: none;
}

.profile__right {
  border-left: 1px solid var(--vc-border);
  padding-left: 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile__tenant {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.profile__tenant-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.profile__tenant-dot {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.profile__tenant-name {
  background: none;
  border: none;
  font: inherit;
  font-size: 0.88rem;
  color: var(--vc-purple);
  cursor: pointer;
  text-align: center;
  padding: 0;
}

.profile__tenant-name.is-active {
  font-weight: 700;
  text-decoration: underline;
}

.profile__label {
  margin: 0 0 5px;
  font-size: 0.85rem;
  font-weight: 700;
}

.profile__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile__fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

@media (max-width: 820px) {
  .profile {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile__picture {
    max-width: 240px;
  }

  .profile__right {
    border-left: none;
    padding-left: 0;
  }

  .profile__tenant {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile__tenant-mark {
    flex-direction: row;
    align-items: center;
  }
}
</style>
