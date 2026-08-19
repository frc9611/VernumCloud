# Vernum Cloud

Dashboard da plataforma Vernum, usado pelos times de robótica para gerenciar equipe, divisões,
arquivos e processos seletivos. Consome a API do
[VernumServer](../IdeaProjects/VernumServer).

Vue 3 com `<script setup>`, Vue CLI, Pinia e axios.

## Telas

| Tela | Rota |
|---|---|
| Login | `/` |
| Escolher equipe (quando a pessoa está em mais de uma) | `/equipes` |
| Sala de espera com os processos seletivos abertos | `/aguardando` |
| Dashboard (Home / Apps / Scouting) | `/home` |
| Perfil, com as equipes e o cargo em cada divisão | `/profile` |
| Equipe | `/equipe` |
| Divisões (árvore) e detalhe da divisão | `/divisoes`, `/divisoes/:id` |
| Painel de administração | `/admin` |
| Equipes da plataforma | `/admin/tenants` |
| Membros e editor de permissões | `/admin/membros` |
| Divisões e subdivisões | `/admin/divisoes` |
| Cadastrar usuário | `/admin/usuarios/novo` |
| Processos seletivos e painel de candidatos | `/admin/processos`, `/admin/processos/:id` |
| Arquivos | `/cloud`, `/cloud/:id` |
| Compartilhados comigo | `/compartilhados` |
| Pedidos de acesso | `/pedidos-de-acesso` |
| **Candidatura pública, sem conta** | `/candidatar/:token` |
| Processos abertos | `/processos-seletivos` |
| Minhas candidaturas | `/minhas-candidaturas` |

Screenshot de cada uma em [`docs/screens/`](docs/screens); os mockups que serviram de base estão em
[`docs/mockups/`](docs/mockups).

## Design

Tudo vem de `src/assets/vernum.css`: um conjunto de tokens e classes `.vc-*`. A cor de destaque é a
**cor da equipe aberta** — `src/services/theme.js` reescreve `--vc-purple` e as três tonalidades
derivadas dela, então trocar de equipe repinta abas, botões, chips, cabeçalhos de card e a própria
marca. Fora de uma equipe, volta ao roxo `#8864AE` dos mockups.

Ícones ficam em `src/components/AppIcon.vue`, desenhados a traço num grid 24x24 com `currentColor`.
Não use emoji em template.

## Configuração

```bash
npm install
```

### Desenvolvimento

```bash
npm run serve                                          # API em http://localhost:8080
VUE_APP_API_URL=http://localhost:8099 npm run serve    # API em outra porta
```

A origem do dashboard tem que estar em `VERNUM_ALLOWED_ORIGINS` no `.env` do servidor, senão o
navegador bloqueia por CORS.

### Produção

```bash
npm run build
```

### Lint

```bash
npm run lint
```

O `npm run build` já roda o eslint, então ele é o caminho mais rápido para conferir se está tudo
válido.

## Documentação

As regras do produto e a referência da API ficam no repositório do servidor:

- `docs/CONTINUE.md` — o que existe, o que falta, como mexer
- `docs/ARCHITECTURE.md` — tenants, permissões, cloud, notificações
- `docs/API.md` — todas as rotas

Aqui, [`CLAUDE.md`](CLAUDE.md) tem as regras específicas do dashboard. Numa sessão do Claude Code,
`/continue-vernum-dev` carrega tudo na ordem certa.
