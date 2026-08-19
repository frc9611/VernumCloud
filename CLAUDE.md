# VernumCloud

Dashboard do Vernum: Vue 3 (`<script setup>`), Vue CLI, Pinia, axios. Consome a API do
**VernumServer**, em `~/IdeaProjects/VernumServer` — a documentação do produto inteiro vive lá.
Adicione com `/add-dir ~/IdeaProjects/VernumServer`, ou rode `/continue-vernum-dev`, que já carrega
tudo na ordem certa.

| Arquivo (no servidor) | Para quê |
|---|---|
| `docs/CONTINUE.md` | o que existe, o que falta, como mexer |
| `docs/ARCHITECTURE.md` | tenants, permissões, cloud, notificações |
| `docs/API.md` | todas as rotas e a permissão de cada uma |

Referências visuais aqui: `docs/mockups/` (mockups originais) e `docs/screens/` (screenshot de cada
tela como está hoje).

## Como está organizado

```
src/
  assets/vernum.css        tokens e classes .vc-* — única fonte de cor, espaçamento e forma
  components/              AppHeader, AppIcon, TabBar, AlertBanner, PanelCard, ModalDialog,
                           SectionTitle, EmptyState, VernumLogo
  services/api.js          todos os endpoints, agrupados por assunto
  services/http.js         axios + token + 401 → login + apiMessage(error, fallback)
  services/theme.js        cor de destaque por equipe
  store/auth.js            sessão: memberships, equipe ativa, can() / canPlatform()
  store/notifications.js   sino do header
  views/                   telas: admin/ cloud/ divisions/ recruitment/ public/
  router/index.ts          rotas + guard por permissão
```

## Regras

- **Endpoint novo entra em `services/api.js`.** Nunca `http.get('/rota')` dentro de uma view.
- **Cor e espaçamento vêm de `assets/vernum.css`.** Nada de hex solto: a cor de destaque é a da
  equipe aberta, injetada em `--vc-purple` por `services/theme.js`. Se faltar um token, adicione lá.
- **Ícone novo entra em `components/AppIcon.vue`** (traço, grid 24x24, `currentColor`).
  **Nunca use emoji em template**: muda de forma por plataforma e não acompanha a cor da equipe.
- **Permissão nas duas pontas**: esconda a ação com `auth.can('X')` / `auth.canPlatform('X')` **e**
  proteja a rota com `meta.permission` / `meta.platform`.
- **Erro para o usuário**: `toast.error(apiMessage(error, 'texto padrão'))` — aproveita a mensagem
  em português que o servidor manda.
- **Depois de mexer em equipe, divisão ou permissão**: `await auth.loadMe()`, senão a interface
  segue com as permissões antigas.
- Tela administrativa nova também entra como card em `views/admin/AdminView.vue`.
- Comentários e nomes de código em inglês; textos de interface em português.

### `meta` das rotas

`auth` (precisa login) · `tenant` (precisa equipe aberta) · `permission` · `platform` ·
`bare` (sem header: login e formulário público) · `footer`.

### Para onde o login leva

Sai de `MeDto.memberships`: nenhuma equipe → `/aguardando` (processos seletivos abertos); mais de
uma e nenhuma escolhida → `/equipes`; exatamente uma → abre direto.

## Rodar

```bash
npm install
npm run serve                                          # API em http://localhost:8080
VUE_APP_API_URL=http://localhost:8099 npm run serve    # API em outra porta
```

A origem do dashboard tem que estar em `VERNUM_ALLOWED_ORIGINS` no `.env` do servidor, senão o
navegador bloqueia por CORS.

## Verificar

```bash
npx vue-cli-service build --mode development    # compila e roda o eslint
```

Para conferir uma tela sem abrir o navegador, dá para tirar screenshot com o Chrome headless —
a receita está em `docs/CONTINUE.md` do servidor e os resultados em `docs/screens/`.

## Commits

Uma frase curta em inglês, sem prefixo (`feat:`, `fix:`), corpo explicando o porquê quando não é
óbvio. Commits por assunto.
