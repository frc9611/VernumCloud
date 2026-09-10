<template>
  <ModalDialog :title="'Comentários de ' + item.name" @close="$emit('close')">
    <p v-if="!comments.length" class="vc-faint" style="margin: 0">Nenhum comentário ainda.</p>
    <article v-for="comment in comments" :key="comment.commentId" class="cloud-comment">
      <div class="vc-row vc-row--between">
        <strong class="vc-small">{{ comment.authorName }}</strong>
        <span class="vc-faint">{{ formatDateTime(comment.createdAt) }}</span>
      </div>
      <p style="margin: 4px 0 0">{{ comment.content }}</p>
      <template v-if="comment.authorId === auth.getId">
        <!-- Removing a comment has no lixeira behind it, so the button asks before it takes -->
        <div v-if="removingId === comment.commentId" class="vc-row" style="margin-top: 6px; gap: 6px">
          <span class="vc-small vc-danger-text">Remover para sempre?</span>
          <button class="vc-btn vc-btn--danger vc-btn--small" type="button" @click="removeComment(comment)">
            Remover
          </button>
          <button class="vc-btn vc-btn--ghost vc-btn--small" type="button" @click="removingId = null">
            Cancelar
          </button>
        </div>
        <button v-else class="vc-btn vc-btn--ghost vc-btn--small" style="margin-top: 6px"
                type="button" @click="removingId = comment.commentId">
          Remover
        </button>
      </template>
    </article>

    <hr class="vc-divider" />
    <div class="vc-field">
      <label class="vc-label" for="newComment">Novo comentário</label>
      <textarea id="newComment" class="vc-textarea" v-model="draft"
                placeholder="Escreva algo sobre este item."></textarea>
    </div>

    <template #footer>
      <button class="vc-btn vc-btn--ghost" type="button" @click="$emit('close')">Fechar</button>
      <button class="vc-btn" type="button" :disabled="!draft.trim()" @click="addComment">Comentar</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import ModalDialog from '@/components/ModalDialog.vue';
import { authStore } from '@/store/auth.js';
import { cloud } from '@/services/api.js';
import { apiMessage } from '@/services/http.js';
import { formatDateTime } from '@/services/time.js';

/* The thread of one folder or one file. Anybody who opens the item reads it; only the author removes. */
const props = defineProps({
  kind: { type: String, required: true },
  item: { type: Object, required: true },
});

defineEmits(['close']);

const auth = authStore();
const toast = useToast();
const comments = ref([]);
const draft = ref('');
const removingId = ref(null);

onMounted(load);

async function load() {
  try {
    const { data } = props.kind === 'folder'
      ? await cloud.folderComments(props.item.id)
      : await cloud.fileComments(props.item.fileId);
    comments.value = data;
  } catch (error) {
    comments.value = [];
  }
  removingId.value = null;
}

async function addComment() {
  try {
    if (props.kind === 'folder') await cloud.commentFolder(props.item.id, draft.value);
    else await cloud.commentFile(props.item.fileId, draft.value);
    draft.value = '';
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao comentar'));
  }
}

async function removeComment(comment) {
  removingId.value = null;
  try {
    await cloud.removeComment(comment.commentId);
    await load();
  } catch (error) {
    toast.error(apiMessage(error, 'Erro ao remover comentário'));
  }
}
</script>

<style scoped>
.cloud-comment {
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-radius);
  padding: 10px 12px;
  background: var(--vc-surface);
}
</style>
