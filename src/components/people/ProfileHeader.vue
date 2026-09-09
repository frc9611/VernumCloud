<template>
  <header class="phead" :style="{ '--profile-accent': accent }">
    <div class="phead__banner"></div>

    <div class="phead__body">
      <div class="phead__top">
        <div class="phead__picture">
          <img :src="pictureUrl" alt="" @error="pictureFailed = true" v-if="!pictureFailed" />
          <span v-else class="phead__initials" aria-hidden="true">{{ initials }}</span>
        </div>

        <div class="phead__actions">
          <button
            v-if="profile.canEditProfile"
            class="vc-btn vc-btn--ghost vc-btn--small"
            type="button"
            :class="{ 'is-active': customizing }"
            @click="$emit('toggle-customize')"
          >
            <AppIcon name="edit" :size="15" />
            {{ customizing ? 'Concluir' : 'Personalizar perfil' }}
          </button>
          <template v-else>
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
        </div>
      </div>

      <div class="phead__names">
        <h1 class="vc-title phead__name">{{ profile.name }}</h1>
        <span class="vc-faint">@{{ profile.username }}</span>
        <span v-if="!profile.active" class="vc-chip vc-chip--warning">conta desativada</span>
      </div>

      <!-- ------------------------------------------- spotlights, above the role chips on purpose -->
      <div v-if="profile.spotlights && profile.spotlights.length" class="phead__spotlights">
        <span
          v-for="spot in profile.spotlights"
          :key="spot.spotlightId"
          class="phead__spotlight"
          :style="spotlightStyle(spot)"
        >
          <AppIcon name="award" :size="14" />
          {{ spot.text }}
          <span class="vc-faint phead__spotlight-tag">{{ spot.tenantName }}</span>
        </span>
      </div>

      <div class="phead__chips">
        <span
          v-for="(chip, index) in chips"
          :key="index"
          :class="['vc-chip', chip.accent && !chip.color ? 'vc-chip--purple' : '']"
        >
          <span v-if="chip.color" class="vc-dot" :style="{ background: chip.color }" aria-hidden="true"></span>
          <AppIcon v-else-if="chip.icon" :name="chip.icon" :size="13" />
          {{ chip.text }}
        </span>
      </div>

      <!-- --------------------------------------------- highlighted badges, right under the headline -->
      <div v-if="highlighted.length" class="phead__strip">
        <BadgeChip
          v-for="badge in highlighted"
          :key="badge.badgeId"
          :badge="badge"
          :color="colorOf(badge)"
          large
        />
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
      <button v-if="!editing && profile.canEditProfile" class="phead__inline-edit phead__edit-toggle" type="button" @click="startEditing">
        <AppIcon name="edit" :size="12" />
        Editar destaque e bio
      </button>

      <!-- ---------------------------------------------------------- counts -->
      <p class="phead__counts">
        <button class="phead__count-btn" type="button" :disabled="!profile.followers" @click="openList('followers')">
          <strong>{{ profile.followers }}</strong> {{ profile.followers === 1 ? 'seguidor' : 'seguidores' }}
        </button>
        <button class="phead__count-btn" type="button" :disabled="!profile.following" @click="openList('following')">
          <strong>{{ profile.following }}</strong> seguindo
        </button>
        <span v-if="profile.followedByMe" class="vc-chip vc-chip--purple">você segue</span>
      </p>
    </div>

    <ModalDialog v-if="listOpen" :title="listOpen === 'followers' ? 'Seguidores' : 'Seguindo'" @close="listOpen = null">
      <p v-if="listLoading" class="vc-faint">Carregando...</p>
      <EmptyState v-else-if="!list.length" :title="listOpen === 'followers' ? 'Ninguém ainda' : 'Não segue ninguém'" />
      <div v-else class="vc-stack phead__list">
        <PersonLink
          v-for="person in list"
          :key="person.userId"
          class="phead__list-item"
          :user-id="person.userId"
          :name="person.name || person.username"
          avatar
          @click="listOpen = null"
        />
      </div>
    </ModalDialog>
  </header>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PersonLink from '@/components/PersonLink.vue';
import { people, users } from '@/services/api.js';
import BadgeChip from './BadgeChip.vue';
import { badgeColor, defaultHighlight, headlineChips, profileAccent } from './profileText.js';

/*
 * The top of the profile: a banner tinted with the person's first team, the picture overlapping it,
 * name, the chips that say who this is today, the badges they pinned (right under the headline — an
 * achievement is what a visitor should see first), the role in the spotlight, bio, follow, and the
 * follower counts as buttons that open the list. Same block for a student, a mentor, an alumnus or an
 * administrator — only the words change, and `profileText.js` picks them.
 *
 * Editing highlight and bio happens here too, inline, for the person themselves; "Personalizar perfil"
 * only toggles the mode other sections use to reveal what is hidden — this header does not itself hide
 * anything, so it just relays the click upward.
 */
const HIGHLIGHT_LIMIT = 120;
const BIO_LIMIT = 600;

const props = defineProps({
  profile: { type: Object, required: true },
  /** Colour of a team by tenant id, so a badge without colour takes the colour of its issuer. */
  teamColorOf: { type: Function, default: null },
  busy: { type: Boolean, default: false },
  customizing: { type: Boolean, default: false },
});
const emit = defineEmits(['follow', 'unfollow', 'save', 'toggle-customize']);

const pictureFailed = ref(false);
const editing = ref(false);
const form = reactive({ highlight: '', bio: '' });
const listOpen = ref(null);
const listLoading = ref(false);
const list = ref([]);

const pictureUrl = computed(() => users.pictureUrl(props.profile.userId));
const accent = computed(() => profileAccent(props.profile));
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

function spotlightStyle(spot) {
  return { background: spot.colorEnd ? `linear-gradient(120deg, ${spot.color}, ${spot.colorEnd})` : spot.color };
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

async function openList(kind) {
  listOpen.value = kind;
  listLoading.value = true;
  list.value = [];
  try {
    const { data } = kind === 'followers' ? await people.followers(props.profile.userId) : await people.following(props.profile.userId);
    list.value = data;
  } catch (error) {
    list.value = [];
  } finally {
    listLoading.value = false;
  }
}
</script>

<style scoped>
.phead {
  position: relative;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius-lg);
  box-shadow: var(--vc-shadow);
  overflow: hidden;
}

.phead__banner {
  height: 108px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--profile-accent) 75%, var(--vc-surface)) 0%,
    color-mix(in srgb, var(--profile-accent) 28%, var(--vc-surface)) 100%
  );
}

.phead__body {
  padding: 0 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.phead__top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: -46px;
}

.phead__picture {
  flex: none;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vc-surface-muted);
  border: 4px solid var(--vc-surface);
  box-shadow: var(--vc-shadow);
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
  font-size: 2.1rem;
  font-weight: 700;
  color: var(--vc-purple-strong);
}

.phead__actions {
  display: flex;
  gap: 8px;
  flex: none;
  padding-bottom: 8px;
}

.phead__actions .is-active {
  background: var(--vc-purple-soft);
  border-color: var(--vc-purple-border);
  color: var(--vc-purple-strong);
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
  font-size: 1.5rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.phead__spotlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/*
 * A spotlight is somebody else's word about this person — a mentor or the platform featuring them —
 * and it should look like a recognition, not a plain fact: a colored pill instead of bare text, its
 * color set inline per spotlight (a gradient when the admin chose a second color, solid otherwise).
 */
.phead__spotlight {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vc-on-accent);
  padding: 7px 14px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
}

.phead__spotlight-tag {
  color: var(--vc-on-accent);
  opacity: 0.85;
  font-weight: 500;
  font-size: 0.76rem;
}

.phead__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.phead__strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phead__highlight {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 1.02rem;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.phead__edit-toggle {
  align-self: flex-start;
  text-decoration: none;
  color: var(--vc-text-muted);
}

.phead__edit-toggle:hover {
  color: var(--vc-purple-strong);
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
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.phead__count-btn {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.85rem;
  color: var(--vc-text-muted);
  cursor: pointer;
}

.phead__count-btn:hover:not(:disabled) {
  color: var(--vc-purple-strong);
}

.phead__count-btn:disabled {
  cursor: default;
}

.phead__count-btn strong {
  color: var(--vc-text);
}

.phead__list {
  gap: 4px;
}

.phead__list-item {
  padding: 6px 4px;
}

@media (max-width: 700px) {
  .phead__body {
    padding: 0 16px 18px;
    align-items: center;
    text-align: center;
  }

  .phead__top {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .phead__names,
  .phead__spotlights,
  .phead__chips,
  .phead__strip,
  .phead__highlight,
  .phead__counts {
    justify-content: center;
  }

  .phead__form {
    width: 100%;
    text-align: left;
  }
}
</style>
