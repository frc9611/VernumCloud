const puppeteer = require('puppeteer-core');
const [path, out, user, pass, full, team] = process.argv.slice(2);
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8083/', { waitUntil: 'networkidle2' });
  await page.type('input[type="text"]', user);
  await page.type('input[type="password"]', pass);
  await Promise.all([page.waitForNavigation().catch(() => {}), page.click('button[type="submit"]')]);
  await new Promise((r) => setTimeout(r, 1800));
  if (team) {
    await page.evaluate((name) => [...document.querySelectorAll('a, button, .vc-card')]
      .find((el) => el.textContent.includes(name))?.click(), team);
    await new Promise((r) => setTimeout(r, 1800));
  }
  if (path !== '/home') {
    await page.goto('http://localhost:8083' + path, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1800));
  }
  await page.screenshot({ path: out, fullPage: full === 'full' });
  console.log(errors.length ? 'ERROS: ' + errors.join(' | ') : 'sem erros de console');
  await browser.close();
})();
