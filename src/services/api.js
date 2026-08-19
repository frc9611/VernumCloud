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
  list: (tenantId) => http.get(`/tenants/${tenantId}/announcements`),
  create: (tenantId, body) => http.post(`/tenants/${tenantId}/announcements`, body),
  remove: (announcementId) => http.delete(`/announcements/${announcementId}`),
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
  fileDetails: (fileId) => http.get(`/cloud/file/${fileId}/details`),
  updateFile: (fileId, body) => http.put(`/cloud/file/${fileId}`, body),
  removeFile: (fileId) => http.delete(`/cloud/file/${fileId}`),

  folderShares: (folderId) => http.get(`/cloud/folder/${folderId}/shares`),
  shareFolder: (folderId, body) => http.post(`/cloud/folder/${folderId}/shares`, body),
  fileShares: (fileId) => http.get(`/cloud/file/${fileId}/shares`),
  shareFile: (fileId, body) => http.post(`/cloud/file/${fileId}/shares`, body),
  removeShare: (shareId) => http.delete(`/cloud/shares/${shareId}`),

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
  divisions,
  users,
  announcements,
  cloud,
  notifications,
  recruitment,
  publicRecruitment,
};
