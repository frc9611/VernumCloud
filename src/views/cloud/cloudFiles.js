/*
 * What the file manager can say about a file without asking the server.
 *
 * The server keeps a name, a content type and a size, and nothing about what the file IS to a
 * robotics team: the print of a part, the firmware of the arm, the budget of the season. Until it
 * keeps one, the kind is read here from the extension and from the content type — and `file.kind`
 * is the first thing looked at, so the day the server starts sending it the screen already obeys.
 *
 * The content type of an upload is whatever the browser guessed, which for a .step or a .ino is
 * usually nothing at all. That is why the extension comes first and the content type is the
 * fallback, and not the other way round.
 */

/** The limit of one upload, checked before sending so nobody watches 300 MB climb to a refusal. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '20 MB';

/** How much the preview panel reads on its own: text is cheap, a picture on a phone line is not. */
export const PREVIEW_TEXT_LIMIT = 512 * 1024;
export const PREVIEW_BINARY_LIMIT = 8 * 1024 * 1024;

/*
 * The five tags the team asked for, plus the kinds that only earn an icon. `tag: false` means the
 * card shows the icon and the size and stays quiet, which is the rule for everything that is not
 * one of the five.
 */
export const KINDS = {
  CAD: { key: 'CAD', label: 'CAD', icon: 'target', chip: 'vc-chip--purple', tag: true },
  CODE: { key: 'CODE', label: 'Código', icon: 'kanban', chip: 'vc-chip--info', tag: true },
  PHOTO: { key: 'PHOTO', label: 'Foto', icon: 'image', chip: 'vc-chip--success', tag: true },
  DOCUMENT: { key: 'DOCUMENT', label: 'Documento', icon: 'file', chip: 'vc-chip', tag: true },
  BUDGET: { key: 'BUDGET', label: 'Orçamento', icon: 'chart', chip: 'vc-chip--warning', tag: true },
  VIDEO: { key: 'VIDEO', label: 'Vídeo', icon: 'monitor', chip: 'vc-chip', tag: false },
  AUDIO: { key: 'AUDIO', label: 'Áudio', icon: 'megaphone', chip: 'vc-chip', tag: false },
  ARCHIVE: { key: 'ARCHIVE', label: 'Pacote', icon: 'copy', chip: 'vc-chip', tag: false },
  OTHER: { key: 'OTHER', label: 'Arquivo', icon: 'file', chip: 'vc-chip', tag: false },
};

const BY_EXTENSION = {
  CAD: ['step', 'stp', 'stl', 'iges', 'igs', 'sldprt', 'sldasm', 'slddrw', 'ipt', 'iam', 'f3d', 'f3z',
    'dwg', 'dxf', '3mf', 'obj', 'catpart', 'catproduct', 'prt', 'easm', 'skp', 'scad', 'gcode'],
  CODE: ['java', 'py', 'cpp', 'cc', 'cxx', 'c', 'h', 'hpp', 'ino', 'js', 'ts', 'vue', 'json', 'xml',
    'yml', 'yaml', 'cs', 'go', 'rs', 'kt', 'sh', 'lua', 'html', 'css', 'gradle', 'toml', 'properties',
    'ipynb', 'm', 'php', 'rb', 'sql'],
  PHOTO: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tif', 'tiff', 'svg', 'avif'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'odt', 'txt', 'md', 'rtf', 'ppt', 'pptx', 'odp', 'log', 'pages'],
  BUDGET: ['xls', 'xlsx', 'ods', 'csv', 'numbers'],
  VIDEO: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
};

/** Extensions the panel reads as text even when the browser refused to name a content type. */
const TEXT_EXTENSIONS = new Set([
  ...BY_EXTENSION.CODE, 'txt', 'md', 'csv', 'log', 'ini', 'cfg', 'env', 'srt', 'urdf',
]);

const EXTENSION_KIND = (() => {
  const map = {};
  Object.entries(BY_EXTENSION).forEach(([kind, extensions]) => {
    extensions.forEach((extension) => {
      if (!map[extension]) map[extension] = kind;
    });
  });
  return map;
})();

export function extensionOf(name) {
  const text = String(name || '');
  const dot = text.lastIndexOf('.');
  return dot > 0 ? text.slice(dot + 1).toLowerCase() : '';
}

/** The kind of a file: what the server said, if it ever says it, and otherwise what the name shows. */
export function fileKind(file) {
  if (!file) return KINDS.OTHER;
  if (file.kind && KINDS[file.kind]) return KINDS[file.kind];

  const byExtension = EXTENSION_KIND[extensionOf(file.name || file.originalName)];
  if (byExtension) return KINDS[byExtension];

  const type = file.contentType || '';
  if (type.startsWith('image/')) return KINDS.PHOTO;
  if (type.startsWith('video/')) return KINDS.VIDEO;
  if (type.startsWith('audio/')) return KINDS.AUDIO;
  if (type === 'application/pdf') return KINDS.DOCUMENT;
  if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') {
    return KINDS.CODE;
  }
  return KINDS.OTHER;
}

export function isImage(file) {
  return (file?.contentType || '').startsWith('image/')
    || BY_EXTENSION.PHOTO.includes(extensionOf(file?.name));
}

export function isPdf(file) {
  return (file?.contentType || '') === 'application/pdf' || extensionOf(file?.name) === 'pdf';
}

export function isMarkdown(file) {
  return extensionOf(file?.name) === 'md' || (file?.contentType || '') === 'text/markdown';
}

/** Whether the panel can show the bytes as text. Wider than what the server calls text on purpose. */
export function isTextLike(file) {
  const type = file?.contentType || '';
  if (type.startsWith('text/') || type === 'application/json' || type === 'application/xml') return true;
  return TEXT_EXTENSIONS.has(extensionOf(file?.name));
}

/** Files the small editor can open: the server only writes back the content types it calls text. */
export function isEditableText(file) {
  const type = file?.contentType || '';
  return type.startsWith('text/') || type === 'application/json' || type === 'application/xml';
}

export function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

/** Why this file cannot be sent, in the words the toast shows. Null when it can. */
export function uploadRejection(file) {
  if (!file) return 'Arquivo vazio.';
  if (!file.size) return `"${file.name}" está vazio ou é uma pasta. Envie arquivos, um por vez ou vários juntos.`;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" tem ${formatSize(file.size)} e o limite é ${MAX_UPLOAD_LABEL} por arquivo.`;
  }
  return null;
}

/** Search without accents and without case, because nobody types "orçamento" with the cedilla twice. */
export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/*
 * Folders always come before files, whatever the order chosen — the same rule every file manager
 * follows, and what keeps a folder from disappearing to the bottom of a sort by size.
 */
export function compareEntries(first, second, key, direction) {
  if (first.isFolder !== second.isFolder) return first.isFolder ? -1 : 1;
  const factor = direction === 'desc' ? -1 : 1;
  if (key === 'date') {
    const diff = (first.sortDate || 0) - (second.sortDate || 0);
    if (diff) return diff * factor;
  }
  if (key === 'size') {
    const diff = (first.sortSize || 0) - (second.sortSize || 0);
    if (diff) return diff * factor;
  }
  return collator.compare(first.name, second.name) * (key === 'name' ? factor : 1);
}
