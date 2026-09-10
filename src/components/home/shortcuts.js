/*
 * The shortcut cards of the home tab, in their default order.
 *
 * Every card has a stable `key`: it is what the person's arrangement (order and hidden cards) refers
 * to, so a label may change without losing anybody's layout. `when(auth)` says whether the card exists
 * for this person in the team that is open; a card that is not there today is simply skipped and comes
 * back, in its saved place, the day the permission returns.
 *
 * To add a shortcut, append an entry here. It shows up at the end for everybody who already arranged
 * their cards, and in this position for everybody else.
 */
export const SHORTCUTS = [
  {
    key: 'cloud', label: 'Arquivos', icon: 'folder', to: { name: 'cloud' },
    hint: 'Pastas e arquivos da equipe, com compartilhamento.',
    when: (auth) => auth.featureOn('CLOUD'),
  },
  {
    key: 'members', label: 'Equipe', icon: 'users', to: { name: 'teamMembers' },
    hint: 'Todos os membros e seus cargos.',
    when: (auth) => auth.can('MEMBER_VIEW'),
  },
  {
    key: 'divisions', label: 'Divisões', icon: 'divisions', to: { name: 'divisions' },
    hint: 'Divisões, subdivisões e quem está em cada uma.',
    when: (auth) => auth.can('DIVISION_VIEW'),
  },
  {
    key: 'tasks', label: 'Demandas', icon: 'kanban', to: { name: 'tasks' },
    hint: 'O quadro da equipe: prazo, responsáveis e critério de conclusão.',
    when: (auth) => auth.featureOn('TASKS') && auth.can('TASK_VIEW'),
  },
  {
    key: 'recognition', label: 'Reconhecimento', icon: 'heart', to: { name: 'recognition' },
    hint: 'Quem ensinou, ajudou ou segurou a barra — dito em uma frase, para a equipe ver.',
    when: (auth) => auth.featureOn('RECOGNITION') && auth.can('KUDO_VIEW'),
  },
  {
    key: 'calendar', label: 'Calendário', icon: 'calendar', to: { name: 'calendar' },
    hint: 'Reuniões, viagens, eventos e prazos da equipe num lugar só.',
    when: (auth) => auth.can('MEMBER_VIEW'),
  },
  {
    key: 'meetings', label: 'Reuniões', icon: 'comment', to: { name: 'meetings' },
    hint: 'Pauta, ata, decisões e o que ficou combinado — que vira demanda no quadro.',
    when: (auth) => auth.featureOn('MEETINGS') && auth.can('MEETING_VIEW'),
  },
  {
    key: 'wiki', label: 'Base de conhecimento', icon: 'notebook', to: { name: 'wiki' },
    hint: 'Procedimentos, decisões e lições aprendidas — o que a equipe sabe, escrito.',
    when: (auth) => auth.featureOn('KNOWLEDGE_BASE') && auth.can('WIKI_VIEW'),
  },
  {
    key: 'risks', label: 'Riscos', icon: 'alert', to: { name: 'risks' },
    hint: 'Probabilidade, impacto, responsável e mitigação.',
    when: (auth) => auth.featureOn('RISKS') && auth.can('RISK_VIEW'),
  },
  {
    key: 'performance', label: 'Performance', icon: 'target', to: { name: 'performance' },
    hint: 'Runs, testes, readiness por área e a prontidão da equipe.',
    when: (auth) => auth.featureOn('PERFORMANCE') && auth.can('PERFORMANCE_VIEW'),
  },
  {
    key: 'development', label: 'Desenvolvimento', icon: 'seedling', to: { name: 'development' },
    hint: 'Autonomia, competências e frequência de cada pessoa.',
    when: (auth) => auth.featureOn('MEMBER_DEVELOPMENT'),
  },
  {
    key: 'evaluations', label: 'Avaliações', icon: 'star', to: { name: 'evaluations' },
    hint: 'Ciclos de avaliação individual e a próxima competência.',
    when: (auth) => auth.featureOn('EVALUATIONS'),
  },
  {
    key: 'journal', label: 'Caderno do Técnico', icon: 'notebook', to: { name: 'journal' },
    hint: 'Decisões, erros, aprendizados e feedbacks.',
    when: (auth) => auth.featureOn('JOURNAL') && auth.can('JOURNAL_VIEW'),
  },
  {
    key: 'recruitment', label: 'Processos Seletivos', icon: 'clipboard', to: { name: 'adminRecruitment' },
    hint: 'Inscrições, etapas e candidatos.',
    when: (auth) => auth.featureOn('RECRUITMENT') && auth.can('RECRUITMENT_VIEW'),
  },
  {
    key: 'trips', label: 'Viagens', icon: 'plane', to: { name: 'trips' },
    hint: 'Eventos, documentos pedidos e quem já respondeu.',
    when: (auth) => auth.featureOn('TRIPS') && auth.can('TRIP_VIEW'),
  },
  {
    key: 'attendance', label: 'Presença', icon: 'clock', to: { name: 'attendance' },
    hint: 'Quem está na sala, o ranking e o seu histórico de presença.',
    when: (auth) => auth.featureOn('ATTENDANCE'),
  },
  {
    key: 'sharedWithMe', label: 'Compartilhados comigo', icon: 'share', to: { name: 'sharedWithMe' },
    hint: 'O que outras equipes compartilharam com você.',
    when: (auth) => auth.featureOn('CLOUD'),
  },
  {
    /* For everybody: the public list is open to any member, and a person may apply to another team. */
    key: 'openProcesses', label: 'Processos seletivos abertos', icon: 'userPlus', to: { name: 'openProcesses' },
    hint: 'Equipes com inscrições abertas agora, para se candidatar.',
    when: () => true,
  },
  {
    key: 'events', label: 'Eventos e premiações', icon: 'award', to: { name: 'adminEvents' },
    hint: 'Competições, oficinas e ações: quem foi e o que a equipe trouxe de volta.',
    when: (auth) => auth.featureOn('EVENTS') && auth.can('EVENT_VIEW'),
  },
  {
    key: 'landingPage', label: 'Página pública', icon: 'globe', to: { name: 'adminPage' },
    hint: 'A página da equipe na internet: modelo, apresentação, contato e publicações.',
    when: (auth) => auth.featureOn('LANDING_PAGE') && auth.can('PAGE_MANAGE'),
  },
];

export const SHORTCUT_DEFAULTS = SHORTCUTS.map((shortcut) => shortcut.key);

/** The shortcuts this person may open today, still in default order. */
export function availableShortcuts(auth) {
  return SHORTCUTS.filter((shortcut) => shortcut.when(auth));
}
