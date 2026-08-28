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
  revokeApiKey: (apiKeyId) => http.delete(`/apiKeys/${apiKeyId}`),
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
  enter: () => http.post('/attendance/enter'),
  leave: () => http.post('/attendance/leave'),
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

export default {
  session,
  tenants,
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
};
