/*
 * Every call to the Vernum Server, grouped by subject.
 *
 * Views should not build URLs by hand: add the endpoint here so there is a single
 * place that describes what the server offers. The tenant scoped endpoints always
 * take the tenant id as the first argument, which keeps it visible that the answer
 * depends on which team is open.
 */
import http from './http.js';

/* ------------------------------------------------------------------- session */

export const session = {
  login: (credentials) => http.post('/login', credentials),
  verify: () => http.get('/login/verify'),
  me: () => http.get('/me'),
  serverInfo: () => http.get('/serverInfo'),
};

/* --------------------------------------------------------------- preferences */

/*
 * Settings of the person, kept on the server so the theme and the dashboard layout follow them to
 * any browser. The answer is `{ theme, settings }`: `theme` is light | dark | system, `settings` is a
 * JSON object the screens own (dashboard layout per team, and so on). PUT merges what it receives —
 * `settings` keys are merged one level deep and a key set to null is removed — and answers the
 * whole thing back.
 */
export const preferences = {
  all: () => http.get('/me/preferences'),
  save: (body) => http.put('/me/preferences', body),
};

/* ------------------------------------------------------------------- tenants */

export const tenants = {
  list: () => http.get('/tenants'),
  get: (tenantId) => http.get(`/tenants/${tenantId}`),
  create: (body) => http.post('/tenants', body),
  update: (tenantId, body) => http.put(`/tenants/${tenantId}`, body),
  remove: (tenantId) => http.delete(`/tenants/${tenantId}`),
  myPermissions: (tenantId) => http.get(`/tenants/${tenantId}/permissions`),

  members: (tenantId) => http.get(`/tenants/${tenantId}/members`),
  addMember: (tenantId, body) => http.post(`/tenants/${tenantId}/members`, body),
  updateMember: (tenantId, userId, body) => http.put(`/tenants/${tenantId}/members/${userId}`, body),
  removeMember: (tenantId, userId) => http.delete(`/tenants/${tenantId}/members/${userId}`),
  candidates: (tenantId, search) =>
    http.get(`/tenants/${tenantId}/candidates`, { params: search ? { search } : {} }),
};

/* --------------------------------------------------------------------- rooms */

/*
 * Rooms group teams that share a physical space, so presence knows a person is never in two of
 * them at once. Reading is open to any logged person (the recruitment screen groups by room
 * before anybody has a team of their own); writing is platform business, same reach as creating
 * a team. Putting one team into a room goes through `tenants.update` instead, with `roomId`.
 */
export const rooms = {
  list: () => http.get('/rooms'),
  create: (body) => http.post('/rooms', body),
  rename: (roomId, body) => http.put(`/rooms/${roomId}`, body),
  remove: (roomId) => http.delete(`/rooms/${roomId}`),
};

/* ---------------------------------------------------- platform administration */

/*
 * The whole platform from the administrator team: every account, every membership, and the members
 * of a team the caller is not in. Reads need TENANT_VIEW_ALL and writes TENANT_UPDATE, both held in
 * the administrator tenant — there is no bypass inside the /tenants routes, so a platform admin who
 * is not a member of a team manages its people through here. `resetPassword` answers the new
 * one-time password in plain text, once; `deleteUser` removes the person from every team first and
 * refuses when they are the only owner somewhere (the message names the team).
 */
export const platform = {
  overview: () => http.get('/platform/overview'),
  users: (search) => http.get('/platform/users', { params: search ? { search } : {} }),
  resetPassword: (userId) => http.post(`/platform/users/${userId}/resetPassword`),
  setActive: (userId, active) => http.put(`/platform/users/${userId}/active`, { active }),
  deleteUser: (userId) => http.delete(`/platform/users/${userId}`),

  members: (tenantId) => http.get(`/platform/tenants/${tenantId}/members`),
  addMember: (tenantId, body) => http.post(`/platform/tenants/${tenantId}/members`, body),
  updateMember: (tenantId, userId, body) => http.put(`/platform/tenants/${tenantId}/members/${userId}`, body),
  removeMember: (tenantId, userId) => http.delete(`/platform/tenants/${tenantId}/members/${userId}`),
};

/* ----------------------------------------------------------------- catalogs */

export const catalogs = {
  permissions: () => http.get('/permissions'),
  membershipRoles: () => http.get('/membershipRoles'),
  /* The switchable parts of the platform, the ready made sets of them, and the competitions. */
  features: () => http.get('/features'),
  featureProfiles: () => http.get('/featureProfiles'),
  competitionCategories: () => http.get('/competitionCategories'),
};

/* ----------------------------------------------------------------- features */

/*
 * Which parts of the platform a team uses.
 *
 * Reading needs only membership, so a screen can explain that something is switched
 * off instead of silently losing a menu item. Writing needs TENANT_MANAGE, because
 * switching a feature off takes permissions away from everybody in the team.
 */
export const features = {
  state: (tenantId) => http.get(`/tenants/${tenantId}/features`),
  update: (tenantId, body) => http.put(`/tenants/${tenantId}/features`, body),
};

/* ------------------------------------------------------- board of the team */

export const tasks = {
  list: (tenantId, params) => http.get(`/tenants/${tenantId}/tasks`, { params: params || {} }),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/tasks`, body),
  get: (taskId) => http.get(`/tasks/${taskId}`),
  update: (taskId, body) => http.put(`/tasks/${taskId}`, body),
  remove: (taskId) => http.delete(`/tasks/${taskId}`),
  /* Notifies whoever the demanda is on and answers the text, for e-mail or WhatsApp. */
  remind: (taskId) => http.post(`/tasks/${taskId}/reminder`),
  /*
   * The board of every team the person is in, in one call, each task carrying the team it belongs
   * to (tenantName, tenantColor, teamNumber) and the flags assignedToMe / inMyDivisions, so the
   * screen filters without asking again. Params: status, open (booleans as strings).
   */
  mine: (params) => http.get('/tasks/mine', { params: params || {} }),
};

export const risks = {
  list: (tenantId, params) => http.get(`/tenants/${tenantId}/risks`, { params: params || {} }),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/risks`, body),
  update: (riskId, body) => http.put(`/risks/${riskId}`, body),
  remove: (riskId) => http.delete(`/risks/${riskId}`),
};

/* -------------------------------------------------------------- development */

/*
 * How the people of a team are developing. Like the presence register, none of these
 * answers 403 for lack of permission: `scope` says whether the reader reaches the whole
 * team, the divisions they lead, or only themselves.
 */
export const development = {
  scope: (tenantId) => http.get(`/tenants/${tenantId}/development/scope`),
  profiles: (tenantId) => http.get(`/tenants/${tenantId}/development/profiles`),
  profile: (tenantId, userId) => http.get(`/tenants/${tenantId}/development/profiles/${userId}`),
  updateProfile: (tenantId, userId, body) =>
    http.put(`/tenants/${tenantId}/development/profiles/${userId}`, body),

  evaluations: (tenantId, params) =>
    http.get(`/tenants/${tenantId}/evaluations`, { params: params || {} }),
  evaluate: (tenantId, body) => http.post(`/tenants/${tenantId}/evaluations`, body),
  removeEvaluation: (evaluationId) => http.delete(`/evaluations/${evaluationId}`),

  journal: (tenantId) => http.get(`/tenants/${tenantId}/journal`),
  addJournalEntry: (tenantId, body) => http.post(`/tenants/${tenantId}/journal`, body),
  updateJournalEntry: (entryId, body) => http.put(`/journal/${entryId}`, body),
  removeJournalEntry: (entryId) => http.delete(`/journal/${entryId}`),
};

/* -------------------------------------------------------------- performance */

/* The whole module in one call: the screen paints it together, so it asks for it together. */
export const performance = {
  module: (tenantId) => http.get(`/tenants/${tenantId}/performance`),
  createArea: (tenantId, body) => http.post(`/tenants/${tenantId}/performance/areas`, body),
  updateArea: (areaId, body) => http.put(`/performance/areas/${areaId}`, body),
  removeArea: (areaId) => http.delete(`/performance/areas/${areaId}`),
  createRun: (tenantId, body) => http.post(`/tenants/${tenantId}/performance/runs`, body),
  removeRun: (runId) => http.delete(`/performance/runs/${runId}`),

  readiness: (tenantId) => http.get(`/tenants/${tenantId}/readiness`),
  updateReadiness: (tenantId, body) => http.put(`/tenants/${tenantId}/readiness`, body),
};

/* ---------------------------------------------------------- command center */

export const teamDashboard = {
  /* Already cut to what the caller may read: a section they cannot see comes back empty. */
  get: (tenantId) => http.get(`/tenants/${tenantId}/dashboard`),
  /* JSON backup of everything the team operations screens hold. Needs TENANT_MANAGE. */
  export: (tenantId) => http.get(`/tenants/${tenantId}/export`),
};

/* ---------------------------------------------------------------- divisions */

export const divisions = {
  list: (tenantId) => http.get(`/tenants/${tenantId}/divisions`),
  tree: (tenantId) => http.get(`/tenants/${tenantId}/divisions/tree`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/divisions`, body),
  get: (divisionId) => http.get(`/divisions/${divisionId}`),
  update: (divisionId, body) => http.put(`/divisions/${divisionId}`, body),
  remove: (divisionId) => http.delete(`/divisions/${divisionId}`),

  members: (divisionId) => http.get(`/divisions/${divisionId}/members`),
  addMember: (divisionId, body) => http.post(`/divisions/${divisionId}/members`, body),
  updateMember: (divisionId, userId, body) => http.put(`/divisions/${divisionId}/members/${userId}`, body),
  removeMember: (divisionId, userId) => http.delete(`/divisions/${divisionId}/members/${userId}`),
};

/* -------------------------------------------------------------------- users */

export const users = {
  list: () => http.get('/users'),
  get: (userId) => http.get(`/user/${userId}`),
  create: (body) => http.post('/users', body),
  update: (userId, body) => http.put(`/users/${userId}`, body),
  remove: (username) => http.delete(`/users/${username}`),
  pictureUrl: (userId) => `${http.defaults.baseURL}/users/${userId}/picture`,
  picture: (userId) => http.get(`/users/${userId}/picture`, { responseType: 'blob' }),
  uploadPicture: (userId, file) => {
    const form = new FormData();
    form.append('file', file);
    return http.put(`/users/${userId}/picture`, form);
  },
};

/* ------------------------------------------------------------ announcements */

export const announcements = {
  /* The board of a team: the platform announcements, the team ones and the divisions of the reader. */
  list: (tenantId) => http.get(`/tenants/${tenantId}/announcements`),
  /* Which reaches this person may publish to — the server decides, leading a division is not a permission. */
  scopes: (tenantId) => http.get(`/tenants/${tenantId}/announcements/scopes`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/announcements`, body),
  remove: (announcementId) => http.delete(`/announcements/${announcementId}`),

  comments: (announcementId) => http.get(`/announcements/${announcementId}/comments`),
  comment: (announcementId, body) => http.post(`/announcements/${announcementId}/comments`, body),
  removeComment: (commentId) => http.delete(`/announcementComments/${commentId}`),
};

/* -------------------------------------------------------------------- cloud */

export const cloud = {
  root: (tenantId) => http.get(`/tenants/${tenantId}/cloud/root`),
  folder: (folderId) => http.get(`/cloud/folder/${folderId}`),
  createFolder: (body) => http.post('/cloud/folder', body),
  updateFolder: (folderId, body) => http.put(`/cloud/folder/${folderId}`, body),
  removeFolder: (folderId) => http.delete(`/cloud/folder/${folderId}`),
  sharedWithMe: () => http.get('/cloud/sharedWithMe'),

  upload: (folderId, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folderId', folderId);
    return http.post('/cloud/uploadFile', form, { onUploadProgress: onProgress });
  },
  download: (fileId) => http.get(`/cloud/file/${fileId}`, { responseType: 'blob' }),
  createTextFile: (body) => http.post('/cloud/file', body),
  fileContent: (fileId) => http.get(`/cloud/file/${fileId}/content`),
  saveFileContent: (fileId, content) => http.put(`/cloud/file/${fileId}/content`, { content }),
  fileDetails: (fileId) => http.get(`/cloud/file/${fileId}/details`),
  updateFile: (fileId, body) => http.put(`/cloud/file/${fileId}`, body),
  removeFile: (fileId) => http.delete(`/cloud/file/${fileId}`),

  folderShares: (folderId) => http.get(`/cloud/folder/${folderId}/shares`),
  shareFolder: (folderId, body) => http.post(`/cloud/folder/${folderId}/shares`, body),
  fileShares: (fileId) => http.get(`/cloud/file/${fileId}/shares`),
  shareFile: (fileId, body) => http.post(`/cloud/file/${fileId}/shares`, body),
  removeShare: (shareId) => http.delete(`/cloud/shares/${shareId}`),
  folderShareTargets: (folderId, search) =>
    http.get(`/cloud/folder/${folderId}/shareTargets`, { params: search ? { search } : {} }),
  fileShareTargets: (fileId, search) =>
    http.get(`/cloud/file/${fileId}/shareTargets`, { params: search ? { search } : {} }),

  requestFolderAccess: (folderId, body) => http.post(`/cloud/folder/${folderId}/accessRequests`, body || {}),
  requestFileAccess: (fileId, body) => http.post(`/cloud/file/${fileId}/accessRequests`, body || {}),
  accessRequests: () => http.get('/cloud/accessRequests'),
  myAccessRequests: () => http.get('/cloud/accessRequests/mine'),
  approveAccessRequest: (requestId, body) => http.post(`/cloud/accessRequests/${requestId}/approve`, body || {}),
  denyAccessRequest: (requestId, body) => http.post(`/cloud/accessRequests/${requestId}/deny`, body || {}),

  folderComments: (folderId) => http.get(`/cloud/folder/${folderId}/comments`),
  commentFolder: (folderId, content) => http.post(`/cloud/folder/${folderId}/comments`, { content }),
  fileComments: (fileId) => http.get(`/cloud/file/${fileId}/comments`),
  commentFile: (fileId, content) => http.post(`/cloud/file/${fileId}/comments`, { content }),
  removeComment: (commentId) => http.delete(`/cloud/comments/${commentId}`),
};

/* --------------------------------------------------------------------- apps */

export const apps = {
  list: (tenantId) => http.get(`/tenants/${tenantId}/apps`),
  available: (tenantId) => http.get(`/tenants/${tenantId}/apps/available`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/apps`, body),
  install: (tenantId, appId) => http.post(`/tenants/${tenantId}/apps/${appId}/install`),
  uninstall: (tenantId, appId) => http.delete(`/tenants/${tenantId}/apps/${appId}/install`),

  get: (appId, tenantId) => http.get(`/apps/${appId}`, { params: tenantId ? { tenantId } : {} }),
  update: (appId, body) => http.put(`/apps/${appId}`, body),
  rotateSecret: (appId) => http.post(`/apps/${appId}/rotateSecret`),
  remove: (appId) => http.delete(`/apps/${appId}`),

  apiKeys: (tenantId) => http.get(`/tenants/${tenantId}/apiKeys`),
  createApiKey: (tenantId, body) => http.post(`/tenants/${tenantId}/apiKeys`, body),
  /* Desliga a chave em todas as equipes. Só a equipe que a criou pode. */
  revokeApiKey: (apiKeyId) => http.delete(`/apiKeys/${apiKeyId}`),
  /* Tira só esta equipe de uma chave que outra criou; ela continua valendo lá. */
  removeApiKeyFromTenant: (tenantId, apiKeyId) =>
    http.delete(`/tenants/${tenantId}/apiKeys/${apiKeyId}`),
};

/*
 * "Entrar com o VernumCloud". The app sends the browser to the consent screen with its
 * client id; the screen asks the server what the app is — that call needs no token,
 * because it happens before the login — and posts the authorization when the person
 * says yes.
 */
export const sso = {
  app: (clientId, redirectUri) => http.get('/public/sso/app', { params: { clientId, redirectUri } }),
  authorize: (body) => http.post('/sso/authorize', body),
};

/* --------------------------------------------------------------- attendance */

export const attendance = {
  me: () => http.get('/attendance/me'),
  /* The rooms the caller's teams touch. More than one means the screen has to ask before entering. */
  rooms: () => http.get('/attendance/rooms'),
  /* roomId: omit to let a single room resolve itself, 0 for "Sem sala", or a room's id. */
  enter: (roomId) => http.post('/attendance/enter', null, { params: roomId != null ? { roomId } : {} }),
  leave: (roomId) => http.post('/attendance/leave', null, { params: roomId != null ? { roomId } : {} }),
  /* How far the register of the team reaches for whoever is asking: team, divisions or self. */
  scope: (tenantId) => http.get(`/tenants/${tenantId}/attendance/scope`),
  now: (tenantId) => http.get(`/tenants/${tenantId}/attendance/now`),
  ranking: (tenantId, params) =>
    http.get(`/tenants/${tenantId}/attendance/ranking`, { params: params || {} }),
  entries: (tenantId, params) =>
    http.get(`/tenants/${tenantId}/attendance/entries`, { params: params || {} }),
  close: (attendanceId, endTime) =>
    http.post(`/attendance/${attendanceId}/close`, null, { params: endTime ? { endTime } : {} }),
};

/* ---------------------------------------------------------------------- rfid */

/*
 * The card somebody carries. It belongs to the person and not to the team — the same
 * card opens any room they walk into — so the person reads and writes their own here,
 * and a team only ever reads and revokes the ones of its members.
 *
 * There is no route that registers a card for somebody else, and that is deliberate:
 * a card is claimed by putting it on a reader, never by typing a number somebody read
 * off a screen.
 */
export const rfid = {
  myTags: () => http.get('/rfidTags/me'),
  removeTag: (tagId) => http.delete(`/rfidTags/${tagId}`),
  teamTags: (tenantId) => http.get(`/tenants/${tenantId}/rfidTags`),
};

/* --------------------------------------------------------------------- trips */

export const trips = {
  /* Organising */
  list: (tenantId) => http.get(`/tenants/${tenantId}/trips`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/trips`, body),
  get: (tripId) => http.get(`/trips/${tripId}`),
  update: (tripId, body) => http.put(`/trips/${tripId}`, body),
  cancel: (tripId) => http.post(`/trips/${tripId}/cancel`),
  remove: (tripId) => http.delete(`/trips/${tripId}`),

  addDocument: (tripId, body) => http.post(`/trips/${tripId}/documents`, body),
  updateDocument: (tripId, documentId, body) => http.put(`/trips/${tripId}/documents/${documentId}`, body),
  removeDocument: (tripId, documentId) => http.delete(`/trips/${tripId}/documents/${documentId}`),
  uploadTemplate: (tripId, documentId, file) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/trips/${tripId}/documents/${documentId}/template`, form);
  },
  /* Blob, never a cloud id: the bytes come back through the trip, checked against the invitation. */
  downloadTemplate: (tripId, documentId) =>
    http.get(`/trips/${tripId}/documents/${documentId}/template`, { responseType: 'blob' }),

  invite: (tripId, body) => http.post(`/trips/${tripId}/invites`, body),
  removeInvite: (tripId, inviteId) => http.delete(`/trips/${tripId}/invites/${inviteId}`),

  /* Being invited */
  mine: () => http.get('/trips/mine'),
  invitation: (tripId) => http.get(`/trips/${tripId}/invitation`),
  answer: (tripId, body) => http.post(`/trips/${tripId}/answer`, body),
  submit: (tripId, documentId, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/trips/${tripId}/documents/${documentId}/file`, form,
      { onUploadProgress: onProgress });
  },
  downloadSubmission: (tripId, submissionId) =>
    http.get(`/trips/${tripId}/submissions/${submissionId}/file`, { responseType: 'blob' }),
};

/* ------------------------------------------------------------ notifications */

export const notifications = {
  list: (params) => http.get('/notifications', { params: params || {} }),
  unreadCount: () => http.get('/notifications/unreadCount'),
  markRead: (notificationId) => http.post(`/notifications/${notificationId}/read`),
  markAllRead: () => http.post('/notifications/readAll'),
  remove: (notificationId) => http.delete(`/notifications/${notificationId}`),
};

/* ------------------------------------------------------------- recruitment */

export const recruitment = {
  processes: (tenantId) => http.get(`/tenants/${tenantId}/recruitment`),
  createProcess: (tenantId, body) => http.post(`/tenants/${tenantId}/recruitment`, body),
  process: (processId) => http.get(`/recruitment/${processId}`),
  updateProcess: (processId, body) => http.put(`/recruitment/${processId}`, body),
  renewLink: (processId) => http.post(`/recruitment/${processId}/renewLink`),
  removeProcess: (processId) => http.delete(`/recruitment/${processId}`),

  stages: (processId) => http.get(`/recruitment/${processId}/stages`),
  addStage: (processId, body) => http.post(`/recruitment/${processId}/stages`, body),
  updateStage: (stageId, body) => http.put(`/recruitment/stages/${stageId}`, body),
  removeStage: (stageId) => http.delete(`/recruitment/stages/${stageId}`),

  entries: (processId, params) => http.get(`/recruitment/${processId}/entries`, { params: params || {} }),
  entry: (entryId) => http.get(`/recruitment/entries/${entryId}`),
  updateEntry: (entryId, body) => http.put(`/recruitment/entries/${entryId}`, body),
  approve: (entryId, body) => http.post(`/recruitment/entries/${entryId}/approve`, body || {}),
  reject: (entryId, body) => http.post(`/recruitment/entries/${entryId}/reject`, body || {}),
  convert: (entryId, body) => http.post(`/recruitment/entries/${entryId}/convert`, body || {}),
  welcomeSheet: (entryId) =>
    http.post(`/recruitment/entries/${entryId}/welcomeSheet`, null, { responseType: 'blob' }),

  notes: (entryId) => http.get(`/recruitment/entries/${entryId}/notes`),
  addNote: (entryId, body) => http.post(`/recruitment/entries/${entryId}/notes`, body),
  removeNote: (noteId) => http.delete(`/recruitment/notes/${noteId}`),

  myEntries: () => http.get('/recruitment/myEntries'),
};

/*
 * The public side of the selection processes. These calls work without a token,
 * which is what lets a person apply before having an account.
 */
export const publicRecruitment = {
  open: () => http.get('/public/recruitment'),
  process: (token) => http.get(`/public/recruitment/${token}`),
  submit: (token, body) => http.post(`/public/recruitment/${token}/entries`, body),
  prefill: () => http.get('/public/recruitment/prefill'),
};

/* ---------------------------------------------------------------- team page */

/** PNG, JPEG, WebP or GIF up to 5 MB, in the multipart field the server expects. */
function putImage(path, file) {
  const form = new FormData();
  form.append('file', file);
  return http.put(path, form);
}

/*
 * The public page of a team, from the editor's side. Reading needs only membership (and the
 * LANDING_PAGE feature on), so a member can see how the page stands; writing needs PAGE_MANAGE.
 * The page write is partial: a field left out keeps its value, an empty string clears it, and
 * `{ published: true }` alone publishes. These image routes need the token, so the editor loads
 * them as blobs (like the profile picture) — the public ones below go straight into <img src>.
 */
export const page = {
  get: (tenantId) => http.get(`/tenants/${tenantId}/page`),
  update: (tenantId, body) => http.put(`/tenants/${tenantId}/page`, body),

  logoBlob: (tenantId) => http.get(`/tenants/${tenantId}/page/logo`, { responseType: 'blob' }),
  uploadLogo: (tenantId, file) => putImage(`/tenants/${tenantId}/page/logo`, file),
  removeLogo: (tenantId) => http.delete(`/tenants/${tenantId}/page/logo`),
  coverBlob: (tenantId) => http.get(`/tenants/${tenantId}/page/cover`, { responseType: 'blob' }),
  uploadCover: (tenantId, file) => putImage(`/tenants/${tenantId}/page/cover`, file),
  removeCover: (tenantId) => http.delete(`/tenants/${tenantId}/page/cover`),

  /* Every post, drafts included, newest first. */
  posts: (tenantId) => http.get(`/tenants/${tenantId}/page/posts`),
  createPost: (tenantId, body) => http.post(`/tenants/${tenantId}/page/posts`, body),
  /* `status: 'PUBLISHED'` stamps publishedAt the first time only; back to DRAFT keeps it. */
  updatePost: (postId, body) => http.put(`/page/posts/${postId}`, body),
  removePost: (postId) => http.delete(`/page/posts/${postId}`),
  postCoverBlob: (postId) => http.get(`/page/posts/${postId}/cover`, { responseType: 'blob' }),
  uploadPostCover: (postId, file) => putImage(`/page/posts/${postId}/cover`, file),
  removePostCover: (postId) => http.delete(`/page/posts/${postId}/cover`),
};

/*
 * The same page as the internet reads it: no token, published content only, and one 404 for
 * everything the server will not tell a visitor. The image paths in the answer are relative to
 * the API, so `imageUrl` is what an <img src> takes.
 */
export const publicPage = {
  team: (slug) => http.get(`/public/teams/${encodeURIComponent(slug)}`),
  post: (slug, postId) => http.get(`/public/teams/${encodeURIComponent(slug)}/posts/${postId}`),
  imageUrl: (path) => `${http.defaults.baseURL}${path}`,
};

/* -------------------------------------------------------------------- people */

/*
 * A person beyond the team: the profile anybody logged in may read, what the person writes about
 * themselves, the badges, the past affiliations and the people who follow them. Editing somebody's
 * teams from the profile page goes through `tenants.*Member` (team admin) or `platform.*` (platform
 * admin) — there is no separate route for that on purpose.
 */
export const people = {
  profile: (userId) => http.get(`/people/${userId}`),
  search: (search) => http.get('/people', { params: { search } }),
  updateMyProfile: (body) => http.put('/people/me/profile', body),
  highlightBadge: (badgeId, highlighted) => http.put(`/people/me/badges/${badgeId}/highlight`, { highlighted }),
  hideMembership: (tenantId, hidden) => http.put(`/people/me/memberships/${tenantId}/hidden`, { hidden }),
  hideBadge: (badgeId, hidden) => http.put(`/people/me/badges/${badgeId}/hidden`, { hidden }),
  /* A mentor or the platform featuring somebody else's profile — same reach as granting a badge. */
  addSpotlight: (userId, body) => http.post(`/people/${userId}/spotlights`, body),
  reorderSpotlights: (userId, spotlightIds) => http.put(`/people/${userId}/spotlights/order`, { spotlightIds }),
  removeSpotlight: (spotlightId) => http.delete(`/spotlights/${spotlightId}`),
  /* Batched: one round trip for the primary spotlight color of every id in `userIds`. */
  spotlightColors: (userIds) => http.get('/people/spotlight-colors', { params: { ids: userIds.join(',') } }),
  badgeCatalog: () => http.get('/badges/catalog'),
  addTrajectory: (tenantId, body) => http.post(`/people/me/memberships/${tenantId}/trajectory`, body),
  reviewTrajectory: (entryId, approve) => http.put(`/trajectory/${entryId}/review`, { approve }),
  removeTrajectory: (entryId) => http.delete(`/trajectory/${entryId}`),
  follow: (userId) => http.post(`/people/${userId}/follow`),
  unfollow: (userId) => http.delete(`/people/${userId}/follow`),
  followers: (userId) => http.get(`/people/${userId}/followers`),
  following: (userId) => http.get(`/people/${userId}/following`),
  grantBadge: (userId, body) => http.post(`/people/${userId}/badges`, body),
  removeBadge: (badgeId) => http.delete(`/badges/${badgeId}`),
  addAffiliation: (userId, body) => http.post(`/people/${userId}/affiliations`, body),
  updateAffiliation: (affiliationId, body) => http.put(`/affiliations/${affiliationId}`, body),
  removeAffiliation: (affiliationId) => http.delete(`/affiliations/${affiliationId}`),
};

/* -------------------------------------------------------------------- events */

/*
 * The events a team went to, who went, and what came back — each participation and each award
 * leaves a badge on the person's profile, generated by the server and removed with the row.
 */
export const events = {
  list: (tenantId) => http.get(`/tenants/${tenantId}/events`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/events`, body),
  get: (eventId) => http.get(`/events/${eventId}`),
  update: (eventId, body) => http.put(`/events/${eventId}`, body),
  remove: (eventId) => http.delete(`/events/${eventId}`),
  addParticipants: (eventId, body) => http.post(`/events/${eventId}/participants`, body),
  updateParticipant: (eventId, userId, body) => http.put(`/events/${eventId}/participants/${userId}`, body),
  removeParticipant: (eventId, userId) => http.delete(`/events/${eventId}/participants/${userId}`),
  createAward: (eventId, body) => http.post(`/events/${eventId}/awards`, body),
  updateAward: (awardId, body) => http.put(`/events/awards/${awardId}`, body),
  removeAward: (awardId) => http.delete(`/events/awards/${awardId}`),
};

export default {
  session,
  preferences,
  people,
  events,
  tenants,
  rooms,
  platform,
  catalogs,
  features,
  tasks,
  risks,
  development,
  performance,
  teamDashboard,
  divisions,
  users,
  announcements,
  cloud,
  apps,
  sso,
  attendance,
  rfid,
  trips,
  notifications,
  recruitment,
  publicRecruitment,
  page,
  publicPage,
};
