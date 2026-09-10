<template>
  <div ref="host" class="md" v-html="html"></div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import { wiki } from '@/services/api.js';

/*
 * Markdown de uma página da base de conhecimento, desenhado.
 *
 * Duas coisas que não são óbvias:
 *
 * 1. O markdown é sanitizado antes de entrar na página. `html: true` deixa escrever HTML no meio do
 *    texto, que é uma coisa legítima de querer numa base de conhecimento (uma tabela com colspan, um
 *    detalhes/summary) — e é também um caminho de XSS entre membros da equipe, porque o texto de uma
 *    pessoa vira DOM na tela de outra. O DOMPurify é o que faz as duas coisas conviverem.
 *
 * 2. A imagem de uma página está atrás de autenticação, e `<img src>` não manda cabeçalho. Depois de
 *    desenhar, cada imagem do wiki é buscada como blob e o endereço trocado por um object URL — que é
 *    revogado quando o componente sai, senão cada visita a uma página vaza a imagem inteira na memória
 *    do navegador.
 */
const props = defineProps({
  content: { type: String, default: '' },
  tenantId: { type: [Number, String], default: null },
});

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });

const host = ref(null);
const objectUrls = [];

/*
 * O endereço da imagem sai do `src` antes de o HTML entrar na página.
 *
 * Se ficasse no `src`, o navegador pediria aquele endereço no host do dashboard — que não tem essa
 * rota — e cada imagem desenhada custaria um 404 antes de a busca autenticada acontecer. Guardado num
 * data-attribute, nenhuma requisição é disparada e quem busca é o código abaixo, com o token.
 */
const WIKI_IMAGE = /(<img\b[^>]*?)\ssrc="(\/tenants\/\d+\/wiki\/images\/[0-9a-fA-F-]{36})"/g;

const html = computed(() => {
  const rendered = md.render(props.content || '').replace(WIKI_IMAGE, '$1 data-wiki-src="$2"');
  return DOMPurify.sanitize(rendered, { ADD_ATTR: ['target', 'rel', 'data-wiki-src'] });
});

watch(html, () => nextTick(loadImages), { immediate: true });

async function loadImages() {
  const root = host.value;
  if (!root) return;
  //Link para fora abre em outra aba; link interno não, senão navegar na base vira um carrossel de abas
  root.querySelectorAll('a[href^="http"]').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });
  const images = [...root.querySelectorAll('img[data-wiki-src]')];
  for (const image of images) {
    const source = image.getAttribute('data-wiki-src') || '';
    const match = source.match(/\/tenants\/(\d+)\/wiki\/images\/([0-9a-fA-F-]{36})/);
    if (!match) continue;
    try {
      const { data } = await wiki.imageBlob(match[1], match[2]);
      const url = URL.createObjectURL(data);
      objectUrls.push(url);
      image.setAttribute('src', url);
    } catch (error) {
      //Uma imagem que não abre não pode derrubar a página: vira o texto alternativo dela
      image.replaceWith(Object.assign(document.createElement('em'), {
        textContent: `[imagem indisponível${image.alt ? ': ' + image.alt : ''}]`,
      }));
    }
  }
}

onBeforeUnmount(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
</script>

<style scoped>
.md {
  color: var(--vc-text);
  line-height: 1.65;
  font-size: 14px;
  overflow-wrap: break-word;
}

.md :deep(h1),
.md :deep(h2) {
  color: var(--vc-purple-strong);
  margin: 22px 0 8px;
  line-height: 1.25;
}

.md :deep(h1) { font-size: 22px; }
.md :deep(h2) { font-size: 18px; }
.md :deep(h3) { font-size: 15px; margin: 18px 0 6px; }

.md :deep(h1:first-child),
.md :deep(h2:first-child),
.md :deep(h3:first-child) {
  margin-top: 0;
}

.md :deep(p) { margin: 0 0 12px; }
.md :deep(ul), .md :deep(ol) { margin: 0 0 12px; padding-left: 22px; }
.md :deep(li) { margin-bottom: 4px; }

.md :deep(a) { color: var(--vc-purple-strong); }

.md :deep(blockquote) {
  margin: 0 0 12px;
  padding: 6px 14px;
  border-left: 3px solid var(--vc-purple-border);
  background: var(--vc-surface-muted);
  color: var(--vc-text-muted);
}

.md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--vc-surface-muted);
}

.md :deep(pre) {
  margin: 0 0 14px;
  padding: 12px;
  border-radius: 8px;
  background: var(--vc-surface-muted);
  overflow-x: auto;
}

.md :deep(pre code) { padding: 0; background: none; }

/* A tabela rola dentro dela mesma: uma tabela larga não pode empurrar a página inteira */
.md :deep(table) {
  display: block;
  overflow-x: auto;
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 14px;
  font-size: 13px;
}

.md :deep(th), .md :deep(td) {
  border: 1px solid var(--vc-border);
  padding: 7px 10px;
  text-align: left;
}

.md :deep(th) { background: var(--vc-surface-muted); }

.md :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--vc-border);
}

.md :deep(hr) {
  border: none;
  border-top: 1px solid var(--vc-border);
  margin: 20px 0;
}
</style>
