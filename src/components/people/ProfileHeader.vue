<template>
  <header class="phead">
    <div class="phead__picture">
      <img :src="pictureUrl" alt="" @error="pictureFailed = true" v-if="!pictureFailed" />
      <span v-else class="phead__initials" aria-hidden="true">{{ initials }}</span>
    </div>

    <div class="phead__body">
      <div class="phead__top">
        <div class="phead__names">
          <h1 class="vc-title phead__name">{{ profile.name }}</h1>
          <span class="vc-faint">@{{ profile.username }}</span>
          <span v-if="!profile.active" class="vc-chip vc-chip--warning">conta desativada</span>
        </div>
        <div class="phead__actions">
          <template v-if="!profile.canEditProfile">
            <button
              :class="['vc-btn', profile.followedByMe ? 'vc-btn--ghost' : '', 'vc-btn--small']"
              type="button"
              :disabled="busy"
              @click="$emit(profile.followedByMe ? 'unfollow' : 'follow')"
            >
              <AppIcon :name="profile.followedByMe ? 'userCheck' : 'userPlus'" :size="15" />
              {{ profile.followedByMe ? 'Deixar de seguir' : 'Seguir' }}
            </button>
          </template>
          <button v-else class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="startEditing">
            <AppIcon name="edit" :size="15" />
            {{ editing ? 'Fechar edição' : 'Editar perfil' }}
          </button>
        </div>
      </div>

      <div class="phead__chips">
        <span
          v-for="(chip, index) in chips"
          :key="index"
          :class="['vc-chip', chip.accent ? 'vc-chip--purple' : '']"
        >
          <AppIcon v-if="chip.icon" :name="chip.icon" :size="13" />
          {{ chip.text }}
        </span>
      </div>

      <!-- ------------------------------------------------- highlight and bio -->
      <template v-if="!editing">
        <p v-if="profile.highlight" class="phead__highlight">
          <AppIcon name="star" :size="16" />
          {{ profile.highlight }}
        </p>
        <p v-else-if="suggestedHighlight" class="phead__highlight phead__highlight--suggested">
          <AppIcon name="star" :size="16" />
          {{ suggestedHighlight }}
          <button v-if="profile.canEditProfile" class="phead__inline-edit" type="button" @click="startEditing">
            destacar outro papel
          </button>
        </p>
        <p v-if="profile.bio" class="phead__bio">{{ profile.bio }}</p>
        <p v-else-if="profile.canEditProfile" class="vc-faint phead__bio">
          Conte em poucas linhas quem você é na equipe.
          <button class="phead__inline-edit" type="button" @click="startEditing">Escrever bio</button>
        </p>
      </template>

      <form v-else class="phead__form" @submit.prevent="save">
        <div class="vc-field">
          <label class="vc-label" for="highlight">Papel em destaque</label>
          <input
            id="highlight"
            class="vc-input"
            type="text"
            v-model="form.highlight"
            :maxlength="HIGHLIGHT_LIMIT"
            :placeholder="suggestedHighlight || 'Capitã 2025, Piloto, Mentor voluntário...'"
          />
          <span class="vc-faint">{{ form.highlight.length }}/{{ HIGHLIGHT_LIMIT }}</span>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="bio">Bio</label>
          <textarea id="bio" class="vc-textarea" rows="3" v-model="form.bio" :maxlength="BIO_LIMIT"
                    placeholder="Quem você é na equipe, o que gosta de fazer, o que busca."></textarea>
          <span class="vc-faint">{{ form.bio.length }}/{{ BIO_LIMIT }}</span>
        </div>
        <div class="vc-row">
          <button class="vc-btn vc-btn--small" type="submit" :disabled="busy">Salvar</button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="editing = false">Cancelar</button>
        </div>
      </form>

      <!-- ---------------------------------------------------------- counts -->
      <p class="phead__counts vc-faint">
        <strong>{{ profile.followers }}</strong> {{ profile.followers === 1 ? 'seguidor' : 'seguidores' }}
        · <strong>{{ profile.following }}</strong> seguindo
        <template v-if="profile.followedByMe"> · você segue</template>
      </p>

      <!-- ------------------------------------------------ highlighted badges -->
      <div v-if="highlighted.length" class="phead__strip">
        <BadgeChip
          v-for="badge in highlighted"
          :key="badge.badgeId"
          :badge="badge"
          :color="colorOf(badge)"
          large
        />
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { users } from '@/services/api.js';
import BadgeChip from './BadgeChip.vue';
import { badgeColor, defaultHighlight, headlineChips } from './profileText.js';

/*
 * The top of the profile: picture, name, the chips that say who this is today, the role the
 * person chose to highlight (or the one the page suggests while they have not), bio, follow and
 * the badges they pinned. Same block for a student, a mentor, an alumnus or an administrator —
 * only the words change, and `profileText.js` picks them.
 *
 * Editing highlight and bio happens here too, inline, for the person themselves. The parent does
 * the saving: this component only emits what to send.
 */
const HIGHLIGHT_LIMIT = 120;
const BIO_LIMIT = 600;

const props = defineProps({
  profile: { type: Object, required: true },
  /** Colour of a team by tenant id, so a badge without colour takes the colour of its issuer. */
  teamColorOf: { type: Function, default: null },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['follow', 'unfollow', 'save']);

const pictureFailed = ref(false);
const editing = ref(false);
const form = reactive({ highlight: '', bio: '' });

const pictureUrl = computed(() => users.pictureUrl(props.profile.userId));
const initials = computed(() =>
  (props.profile.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join(''),
);
const chips = computed(() => headlineChips(props.profile));
const suggestedHighlight = computed(() => defaultHighlight(props.profile));
const highlighted = computed(() => (props.profile.badges || []).filter((badge) => badge.highlighted).slice(0, 3));

function colorOf(badge) {
  return badgeColor(badge, props.teamColorOf);
}

function startEditing() {
  if (editing.value) {
    editing.value = false;
    return;
  }
  form.highlight = props.profile.highlight || '';
  form.bio = props.profile.bio || '';
  editing.value = true;
}

function save() {
  //"" clears on the server, so an emptied field really empties it
  emit('save', { highlight: form.highlight.trim(), bio: form.bio.trim() });
  editing.value = false;
}
</script>

<style scoped>
.phead {
  display: flex;
  gap: 26px;
  align-items: flex-start;
  padding: 18px;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
}

.phead__picture {
  flex: none;
  width: 168px;
  height: 168px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--vc-surface-muted);
  border: 1px solid var(--vc-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.phead__picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.phead__initials {
  font-size: 2.6rem;
  font-weight: 700;
  color: var(--vc-purple-strong);
}

.phead__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phead__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.phead__names {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.phead__name {
  margin: 0;
  font-size: 1.6rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.phead__actions {
  display: flex;
  gap: 8px;
  flex: none;
}

.phead__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.phead__highlight {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vc-purple-strong);
}

.phead__highlight--suggested {
  color: var(--vc-text-muted);
  font-weight: 500;
}

.phead__inline-edit {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.8rem;
  color: var(--vc-purple-strong);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.phead__bio {
  margin: 0;
  color: var(--vc-text);
  font-size: 0.95rem;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.phead__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phead__counts {
  margin: 0;
  font-size: 0.85rem;
}

.phead__counts strong {
  color: var(--vc-text);
}

.phead__strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--vc-border);
}

@media (max-width: 700px) {
  .phead {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .phead__picture {
    width: 140px;
    height: 140px;
  }

  .phead__body {
    align-items: center;
    width: 100%;
  }

  .phead__top,
  .phead__names,
  .phead__chips,
  .phead__highlight,
  .phead__strip {
    justify-content: center;
  }

  .phead__form {
    width: 100%;
    text-align: left;
  }
}
</style>
