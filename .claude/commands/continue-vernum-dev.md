---
description: Retoma o desenvolvimento do Vernum (dashboard + servidor) com todo o contexto carregado
argument-hint: [o que fazer nesta sessão, opcional]
---

Você está no **VernumCloud**, o dashboard Vue 3 do Vernum. A API que ele consome é o
**VernumServer**, e a documentação do produto inteiro vive lá.

## Passo 1 — traga o servidor para a sessão

O servidor não está no contexto: adicione com

```
/add-dir ~/IdeaProjects/VernumServer
```

Depois leia, nesta ordem:

1. `~/IdeaProjects/VernumServer/docs/CONTINUE.md` — o que existe, o que falta, como mexer.
   **Comece por aqui**, e siga as instruções dele: ele é a fonte para as duas pontas.
2. `~/IdeaProjects/VernumServer/docs/ARCHITECTURE.md` — tenants, permissões, cloud, notificações.
3. `~/IdeaProjects/VernumServer/docs/API.md` — rotas e a permissão de cada uma.
4. `CLAUDE.md` deste repositório — as regras do dashboard.

Referências visuais: `docs/mockups/` (os mockups originais) e `docs/screens/` (screenshot de cada
tela como está hoje).

## Passo 2 — entenda o pedido

$ARGUMENTS

Se nada foi pedido acima, mostre a lista de pendências da seção 3 do `docs/CONTINUE.md` do
servidor, na ordem de valor, e pergunte por onde começar.

## Passo 3 — regras do dashboard

- Endpoint novo entra em `src/services/api.js`, nunca `http.get('/rota')` dentro da view.
- Cor, espaçamento e formas vêm de `src/assets/vernum.css` e dos componentes `src/components/`.
  Nada de hex solto numa view: a cor de destaque é a da equipe aberta e vem de `--vc-purple`.
- Ícone novo entra em `src/components/AppIcon.vue`. **Nunca use emoji em template.**
- Permissão: esconda a ação com `auth.can('X')` **e** proteja a rota com `meta.permission`.
- Erro para o usuário: `toast.error(apiMessage(error, 'texto padrão'))`.
- Depois de mexer em equipe, divisão ou permissão: `await auth.loadMe()`.
- Tela administrativa nova também entra como card em `src/views/admin/AdminView.vue`.

## Passo 4 — verifique de verdade

```bash
npx vue-cli-service build --mode development     # compila e roda o eslint
```

Para ver a tela funcionando, suba a API contra um banco descartável (receita na seção 1 do
`docs/CONTINUE.md` do servidor) e rode:

```bash
VUE_APP_API_URL=http://localhost:8099 npm run serve
```

**Nunca** aponte o servidor para o banco do `.env` dele (produção) só para testar.

## Passo 5 — feche a sessão

Commits por assunto, no padrão do repositório (frase curta em inglês, sem prefixo `feat:`).
Atualize os docs do servidor com o que mudou e relate ao usuário o que fez, o que verificou e o
que ficou de fora.
