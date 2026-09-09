/*
 * The code samples the dashboard shows to whoever is integrating with the API: a program with an
 * API key, or an app that logs people in through the Vernum.
 *
 * Everything here is plain strings built from what the screen knows (the key just created, the
 * client_id, the first redirect URI, the API base the dashboard itself talks to), so the same
 * builders can feed a modal, a permanent panel, or a landing page. The wire shapes are the ones
 * the real clients use — ~/VernumRfid (X-API-Key on POST /rfid/attendance, no team in the path)
 * and ~/VernumAttendance/js/vernum.js (PKCE against /entrar-com-vernum and /public/sso/token) —
 * so keep them in step when either changes.
 */

export const API_KEY_PLACEHOLDER = 'vk_SEU_PREFIXO_SEU_SEGREDO';
export const REDIRECT_PLACEHOLDER = 'SEU_ENDERECO_DE_RETORNO';
export const SECRET_PLACEHOLDER = 'SEU_CLIENT_SECRET';

/** Sample card number the reader tools use everywhere. */
const SAMPLE_UID = '04A2B3C4';

/** Strips a trailing slash so the snippets never print "//rfid". */
function trimBase(base) {
  return String(base || '').replace(/\/+$/, '');
}

/* ------------------------------------------------------------------ api keys */

/**
 * Snippets for a key, one per language: curl, JavaScript (fetch), Python (requests) and an
 * ESP8266 sketch fragment shaped like the real firmware.
 *
 * `scopes` decides which call to show: a key with RFID_AUTH gets the reader's tap, any other
 * key gets a generic GET of who is in the room. Pass `null` when the scopes are unknown (the
 * permanent panel) and both calls are shown, so the page teaches the header without needing a key.
 */
export function apiKeyExamples({ key, api, tenantId, scopes }) {
  const base = trimBase(api);
  const token = key || API_KEY_PLACEHOLDER;
  const tenant = tenantId || 'ID_DA_EQUIPE';
  const known = Array.isArray(scopes);
  const reader = !known || scopes.includes('RFID_AUTH');
  const generic = !known || !scopes.includes('RFID_AUTH');

  return [
    { key: 'curl', label: 'curl', code: curlApiKey(base, token, tenant, reader, generic) },
    { key: 'js', label: 'JavaScript', code: jsApiKey(base, token, tenant, reader, generic) },
    { key: 'python', label: 'Python', code: pythonApiKey(base, token, tenant, reader, generic) },
    { key: 'arduino', label: 'ESP8266 / Arduino', code: arduinoApiKey(base, token, tenant, reader) },
  ];
}

function curlApiKey(base, token, tenant, reader, generic) {
  const lines = [];
  if (reader) {
    lines.push(
      '# Bater um cartão: entrada ou saída, decidida no servidor',
      `curl -X POST "${base}/rfid/attendance" \\`,
      `  -H "X-API-Key: ${token}" \\`,
      '  -H "Content-Type: application/json" \\',
      `  -d '{"uid":"${SAMPLE_UID}"}'`,
    );
  }
  if (reader && generic) lines.push('');
  if (generic) {
    lines.push(
      `# Qualquer outra rota aceita o mesmo cabeçalho — quem está na sala da equipe #${tenant}:`,
      `curl "${base}/tenants/${tenant}/attendance/now" \\`,
      `  -H "X-API-Key: ${token}"`,
    );
  }
  return lines.join('\n');
}

function jsApiKey(base, token, tenant, reader, generic) {
  const lines = [
    `const API = '${base}';`,
    `const KEY = '${token}';`,
    '',
  ];
  if (reader) {
    lines.push(
      '// Bater um cartão: entrada ou saída, decidida no servidor',
      'const response = await fetch(`${API}/rfid/attendance`, {',
      "  method: 'POST',",
      "  headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },",
      `  body: JSON.stringify({ uid: '${SAMPLE_UID}' }),`,
      '});',
      'if (!response.ok) throw new Error(`HTTP ${response.status}`);',
      'const tap = await response.json();',
      "console.log(tap.userName, tap.action, tap.sessionSeconds); // action: 'ENTER' ou 'LEAVE'",
    );
  }
  if (reader && generic) lines.push('');
  if (generic) {
    lines.push(
      `// Qualquer outra rota aceita o mesmo cabeçalho — quem está na sala da equipe #${tenant}:`,
      'const now = await fetch(`${API}/tenants/' + tenant + "/attendance/now`, { headers: { 'X-API-Key': KEY } });",
      'if (!now.ok) throw new Error(`HTTP ${now.status}`);',
      'const people = await now.json(); // uma linha por pessoa, com as equipes dela',
    );
  }
  return lines.join('\n');
}

function pythonApiKey(base, token, tenant, reader, generic) {
  const lines = [
    'import requests',
    '',
    `API = '${base}'`,
    `KEY = '${token}'`,
    '',
  ];
  if (reader) {
    lines.push(
      '# Bater um cartão: entrada ou saída, decidida no servidor',
      "response = requests.post(f'{API}/rfid/attendance',",
      "                         headers={'X-API-Key': KEY},",
      `                         json={'uid': '${SAMPLE_UID}'})`,
      'response.raise_for_status()',
      'tap = response.json()',
      "print(tap['userName'], tap['action'], tap['sessionSeconds'])  # action: 'ENTER' ou 'LEAVE'",
    );
  }
  if (reader && generic) lines.push('');
  if (generic) {
    lines.push(
      `# Qualquer outra rota aceita o mesmo cabeçalho — quem está na sala da equipe #${tenant}:`,
      `now = requests.get(f'{API}/tenants/${tenant}/attendance/now', headers={'X-API-Key': KEY})`,
      'now.raise_for_status()',
      'people = now.json()  # uma linha por pessoa, com as equipes dela',
    );
  }
  return lines.join('\n');
}

/*
 * The shape of ~/VernumRfid/lib/Vernum/VernumApi.cpp, boiled down to one function: HTTP/1.0 because
 * the server answers chunked to HTTP/1.1 and HTTPClient's stream does not undo that framing, and the
 * key on X-API-Key. TLS or plain follows the scheme of the API the dashboard is pointed at.
 */
function arduinoApiKey(base, token, tenant, reader) {
  const secure = base.startsWith('https:');
  const lines = [
    '#include <ESP8266WiFi.h>',
    '#include <ESP8266HTTPClient.h>',
  ];
  if (secure) lines.push('#include <WiFiClientSecure.h>');
  lines.push(
    '',
    `const char *VERNUM_API = "${base}";  // sem barra no fim`,
    `const char *VERNUM_API_KEY = "${token}";`,
    '',
  );
  if (reader) {
    lines.push(
      '// Bater um cartão: entrada ou saída, decidida no servidor',
      'int tap(const String &uid) {',
    );
  } else {
    lines.push(
      `// Quem está na sala da equipe #${tenant} — qualquer rota aceita o mesmo cabeçalho`,
      'int whoIsIn() {',
    );
  }
  if (secure) {
    lines.push(
      '  WiFiClientSecure client;',
      '  client.setInsecure();  // em produção, setTrustAnchors() com a CA do servidor (veja ~/VernumRfid)',
    );
  } else {
    lines.push('  WiFiClient client;');
  }
  lines.push(
    '  HTTPClient http;',
    reader
      ? '  http.begin(client, String(VERNUM_API) + "/rfid/attendance");'
      : `  http.begin(client, String(VERNUM_API) + "/tenants/${tenant}/attendance/now");`,
    '  http.useHTTP10(true);  // o servidor responde chunked ao HTTP/1.1, e o parser não desfaz isso',
    '  http.addHeader("Content-Type", "application/json");',
    '  http.addHeader("X-API-Key", VERNUM_API_KEY);',
    reader
      ? '  int status = http.POST("{\\"uid\\":\\"" + uid + "\\"}");'
      : '  int status = http.GET();',
    reader
      ? '  if (status == 200) Serial.println(http.getString());  // {"userName":...,"action":"ENTER"|"LEAVE",...}'
      : '  if (status == 200) Serial.println(http.getString());  // uma linha por pessoa, com as equipes dela',
    '  http.end();',
    '  return status;',
    '}',
  );
  return lines.join('\n');
}

/**
 * What each answer of a key means, for the line under the snippets. The 404 only applies to the
 * reader's route, but a key without RFID_AUTH never reaches it, so saying it always is harmless.
 */
export const API_KEY_ANSWERS = 'A chave também é aceita como Authorization: Bearer vk_…. '
  + 'Respostas: 401 chave revogada, expirada ou desconhecida; '
  + '403 fora dos escopos ou das equipes da chave, ou Presença desligada nelas; '
  + '404 cartão não cadastrado, ou de alguém fora das equipes da chave.';

/* ----------------------------------------------------------------------- sso */

/**
 * The URL an app sends the browser to. A PKCE app (no secret) must carry the challenge, or the
 * consent screen refuses it at authorize — the placeholders say what the app has to generate.
 */
export function consentUrl({ clientId, redirectUri, confidential, dashboard }) {
  const params = 'client_id=' + encodeURIComponent(clientId)
    + '&redirect_uri=' + (redirectUri ? encodeURIComponent(redirectUri) : REDIRECT_PLACEHOLDER)
    + '&state=STATE_ALEATORIO'
    + (confidential ? '' : '&code_challenge=CODE_CHALLENGE&code_challenge_method=S256');
  return trimBase(dashboard) + '/entrar-com-vernum?' + params;
}

/**
 * Snippets for an app with login by the Vernum. A browser app gets the PKCE pair (start and
 * finish, modelled on ~/VernumAttendance/js/vernum.js); an app with a server gets the start on the
 * browser and the exchange with the secret on the server (Node and Python). Both get the exchange
 * as curl and a "what to do with the token" sample. `clientSecret` may be null: the placeholder
 * takes its place, which is what the examples of an existing app show.
 */
export function ssoExamples({ clientId, clientSecret, redirectUri, confidential, dashboard, api }) {
  const context = {
    clientId,
    secret: clientSecret || SECRET_PLACEHOLDER,
    redirect: redirectUri || REDIRECT_PLACEHOLDER,
    cloud: trimBase(dashboard),
    api: trimBase(api),
  };
  const examples = confidential
    ? [
      { key: 'browser', label: 'Navegador (início)', code: confidentialStart(context) },
      { key: 'node', label: 'Servidor (Node)', code: nodeExchange(context) },
      { key: 'python', label: 'Servidor (Python)', code: pythonExchange(context) },
    ]
    : [
      { key: 'browser', label: 'Navegador (PKCE)', code: pkceBrowser(context) },
    ];
  examples.push(
    { key: 'curl', label: 'curl', code: curlExchange(context, confidential) },
    { key: 'after', label: 'Depois do login', code: afterLogin(context) },
  );
  return examples;
}

function pkceBrowser({ clientId, redirect, cloud, api }) {
  return [
    '// Login pelo Vernum com PKCE, para um app que roda só no navegador e não guarda segredo.',
    '// crypto.subtle exige HTTPS ou localhost; ~/VernumAttendance/js/vernum.js tem o SHA-256 puro para http.',
    'const VERNUM = {',
    `  api: '${api}',`,
    `  cloud: '${cloud}',`,
    `  clientId: '${clientId}',`,
    `  redirectUri: '${redirect}',`,
    '};',
    "const PKCE_KEY = 'vernum.pkce';",
    '',
    'function base64Url(bytes) {',
    "  let text = '';",
    '  new Uint8Array(bytes).forEach((byte) => { text += String.fromCharCode(byte); });',
    "  return btoa(text).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');",
    '}',
    '',
    'function randomString() {',
    '  return base64Url(crypto.getRandomValues(new Uint8Array(32)));',
    '}',
    '',
    '// 1. Manda a pessoa para a tela de consentimento do Vernum',
    'async function startVernumLogin() {',
    '  const verifier = randomString();',
    '  const state = randomString().slice(0, 16);',
    '  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));',
    '',
    "  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));",
    '  const query = new URLSearchParams({',
    '    client_id: VERNUM.clientId,',
    '    redirect_uri: VERNUM.redirectUri,',
    '    state,',
    '    code_challenge: base64Url(digest),',
    "    code_challenge_method: 'S256',",
    '  });',
    '  window.location.href = `${VERNUM.cloud}/entrar-com-vernum?${query}`;',
    '}',
    '',
    '// 2. De volta no redirect_uri com ?code=...&state=...: troca o código pelo token.',
    '//    O código vale uma vez, por 5 minutos, e só com o mesmo redirectUri.',
    'async function finishVernumLogin() {',
    '  const query = new URLSearchParams(window.location.search);',
    "  const code = query.get('code');",
    '  if (!code) return null;  // não é uma volta do login',
    '',
    "  const pending = JSON.parse(localStorage.getItem(PKCE_KEY) || 'null');",
    "  if (!pending || query.get('state') !== pending.state) {",
    "    throw new Error('A resposta do login não confere com o pedido. Tente de novo.');",
    '  }',
    '',
    '  // Sem cabeçalho Authorization: o código e o verifier são a prova',
    '  const response = await fetch(`${VERNUM.api}/public/sso/token`, {',
    "    method: 'POST',",
    "    headers: { 'Content-Type': 'application/json' },",
    '    body: JSON.stringify({',
    '      clientId: VERNUM.clientId,',
    '      code,',
    '      redirectUri: VERNUM.redirectUri,',
    '      codeVerifier: pending.verifier,',
    '    }),',
    '  });',
    '  if (!response.ok) throw new Error(`Login recusado: HTTP ${response.status}`);',
    '  const session = await response.json();  // { tokenType, accessToken, expiresIn, appName, me }',
    '',
    '  localStorage.removeItem(PKCE_KEY);',
    '  window.history.replaceState({}, document.title, window.location.pathname);  // tira o código da barra',
    '  return session;',
    '}',
  ].join('\n');
}

function confidentialStart({ clientId, redirect, cloud }) {
  return [
    '// 1. Manda a pessoa para a tela de consentimento do Vernum.',
    '//    Um app com servidor não usa PKCE: quem prova a identidade é o segredo, na troca do código.',
    'const state = crypto.randomUUID();  // guarde na sessão para conferir na volta',
    'const query = new URLSearchParams({',
    `  client_id: '${clientId}',`,
    `  redirect_uri: '${redirect}',`,
    '  state,',
    '});',
    `window.location.href = \`${cloud}/entrar-com-vernum?\${query}\`;`,
    '',
    '// 2. O Vernum devolve o navegador para redirect_uri?code=...&state=...',
    '//    O código vale uma vez, por 5 minutos: o seu servidor troca por um token (abas "Servidor").',
  ].join('\n');
}

function nodeExchange({ clientId, secret, redirect, api }) {
  return [
    '// No servidor do app, na rota do redirect_uri: chegou ?code=...&state=...',
    '// Confira o state contra o que ficou na sessão antes de trocar o código.',
    `const CLIENT_SECRET = '${secret}';  // guarde fora do código, numa variável de ambiente`,
    '',
    'async function exchange(code) {',
    `  const response = await fetch('${api}/public/sso/token', {`,
    "    method: 'POST',",
    "    headers: { 'Content-Type': 'application/json' },",
    '    body: JSON.stringify({',
    `      clientId: '${clientId}',`,
    '      clientSecret: CLIENT_SECRET,',
    '      code,',
    `      redirectUri: '${redirect}',  // o mesmo usado para começar`,
    '    }),',
    '  });',
    '  if (!response.ok) throw new Error(`Login recusado: HTTP ${response.status}`);',
    '  return response.json();  // { tokenType, accessToken, expiresIn, appName, me }',
    '}',
  ].join('\n');
}

function pythonExchange({ clientId, secret, redirect, api }) {
  return [
    'import requests',
    '',
    `VERNUM_API = '${api}'`,
    `CLIENT_ID = '${clientId}'`,
    `CLIENT_SECRET = '${secret}'  # guarde fora do código, numa variável de ambiente`,
    `REDIRECT_URI = '${redirect}'`,
    '',
    '# No servidor do app, na rota do redirect_uri: chegou ?code=...&state=...',
    '# Confira o state contra o que ficou na sessão antes de trocar o código.',
    'def exchange(code):',
    "    response = requests.post(f'{VERNUM_API}/public/sso/token', json={",
    "        'clientId': CLIENT_ID,",
    "        'clientSecret': CLIENT_SECRET,",
    "        'code': code,",
    "        'redirectUri': REDIRECT_URI,  # o mesmo usado para começar",
    '    })',
    '    response.raise_for_status()',
    "    return response.json()  # {'tokenType', 'accessToken', 'expiresIn', 'appName', 'me'}",
  ].join('\n');
}

function curlExchange({ clientId, secret, redirect, api }, confidential) {
  const proof = confidential
    ? `"clientSecret":"${secret}",`
    : '"codeVerifier":"O_VERIFIER_GUARDADO_NO_INICIO",';
  return [
    '# Troca o código que chegou no redirect_uri por um token da pessoa.',
    '# Sem Authorization; o código vale uma vez, por 5 minutos, e só com o mesmo redirectUri.',
    `curl -X POST "${api}/public/sso/token" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"clientId":"${clientId}",${proof}"code":"CODIGO_RECEBIDO","redirectUri":"${redirect}"}'`,
    '',
    '# Resposta: {"tokenType":"Bearer","accessToken":"...","expiresIn":7200,"appName":"...","me":{...}}',
  ].join('\n');
}

function afterLogin({ api }) {
  return [
    '// Todo endpoint da API aceita o token da pessoa que autorizou o app.',
    "const accessToken = 'ACCESS_TOKEN';  // o accessToken que veio na troca do código",
    'const headers = { Authorization: `Bearer ${accessToken}` };',
    '',
    `const me = await (await fetch('${api}/me', { headers })).json();`,
    '// me.user, me.memberships[].tenant, me.memberships[].permissions',
    '',
    `const attendance = await (await fetch('${api}/attendance/me', { headers })).json();`,
    '// { inRoom, since, secondsInRoom, totalSeconds, tenants: [{ tenantName, inRoom, ... }] }',
  ].join('\n');
}
