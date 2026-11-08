// Імпорт текстів і новин зі старого сайту krasine_school.klasna.com.
// Запуск:  npm run import            (сторінки + 30 останніх новин)
//          npm run import -- --news=100
// Наявні файли НЕ перезаписуються, щоб не затерти ваші правки. Додайте --force, щоб перезаписати.

import { writeFile, mkdir, access } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

const BASE = 'https://krasine_school.klasna.com';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const NEWS_LIMIT = Number(args.news ?? 30);
const FORCE = Boolean(args.force);

// Старі сторінки → нові. Кілька старих сторінок можна злити в одну.
const PAGES = [
  { from: ['school-history', 'our-school'], section: 'pro-nas', slug: 'istoriia', title: 'Історія школи', order: 10, description: 'Від початкової школи 1927 року до сьогодення.' },
  { from: ['struktura-ta-organi-uprav'], section: 'pro-nas', slug: 'struktura', title: 'Структура та органи управління', order: 30 },
  { from: ['vakansiyi'], section: 'pro-nas', slug: 'vakansii', title: 'Вакансії', order: 40, description: 'Вакансії педагогічних працівників.' },

  { from: ['zarakhuvannya-uchniv-do-1', 'do-uvagi-batkiv-maibutnik'], section: 'batkam', group: 'Вступ', slug: 'vstup-do-1-klasu', title: 'Вступ до 1 класу', order: 10, description: 'Документи для зарахування, заява і поради, як підготувати дитину до школи.' },
  { from: ['school-entertainment'], section: 'batkam', group: 'Вступ', slug: 'pravyla-pryiomu', title: 'Правила прийому', order: 20, description: 'Порядок зарахування до 1, 10 та інших класів.' },
  { from: ['teritoriyi-obslugovuvanny'], section: 'batkam', group: 'Вступ', slug: 'terytorii-obsluhovuvannia', title: 'Території обслуговування', order: 30, description: 'Території, закріплені за закладом освіти.' },
  { from: ['parents-info'], section: 'batkam', group: 'Корисне', slug: 'porady-batkam', title: 'Поради батькам', order: 40, description: 'Як підтримати дитину, зокрема першокласника.' },
  { from: ['poradi-psikhologa'], section: 'batkam', group: 'Корисне', slug: 'porady-psykholoha', title: 'Поради психолога', order: 50 },
  { from: ['pravila-povedinki-zdobuva'], section: 'batkam', group: 'Корисне', slug: 'pravyla-povedinky', title: 'Правила поведінки здобувачів освіти', order: 60 },
  { from: ['protidiya-bulingu-', 'plan'], section: 'batkam', group: 'Безпека', slug: 'protydiia-bulinhu', title: 'Протидія булінгу', order: 70, description: 'Як діяти, куди звертатися, зразок заяви і план заходів.' },
  { from: ['domashne-nasilstvo'], section: 'batkam', group: 'Безпека', slug: 'domashnie-nasylstvo', title: 'Протидія домашньому насильству', order: 80 },
  { from: ['minna-bezpeka'], section: 'batkam', group: 'Безпека', slug: 'minna-bezpeka', title: 'Мінна безпека', order: 90, description: 'Відео і правила для дітей та батьків.' },

  { from: ['rozmir-plati-za-navchanny'], section: 'dokumenty', slug: 'rozmir-platy', title: 'Розмір плати за навчання', order: 10 },
  { from: ['perelik-dodatkovikh-osvit'], section: 'dokumenty', slug: 'dodatkovi-posluhy', title: 'Додаткові освітні послуги', order: 20 },

  { from: ['shkilne-video'], section: 'novyny', slug: 'video', title: 'Шкільне відео', order: 10 },
];

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
td.addRule('iframe', {
  filter: 'iframe',
  replacement: (_c, node) => `\n\n<div class="video"><iframe src="${node.getAttribute('src')}" loading="lazy" allowfullscreen title="Відео"></iframe></div>\n\n`,
});
// На старому сайті абзаци часто розділені лише <br> — робимо з них окремі абзаци.
td.addRule('br', { filter: 'br', replacement: () => '\n\n' });
td.addRule('emptyHeading', {
  filter: (node) => /^H[1-6]$/.test(node.nodeName) && !node.textContent.trim() && !node.querySelector('img'),
  replacement: () => '',
});

function fixUrls(root) {
  root.querySelectorAll('img').forEach((img) => {
    let src = (img.getAttribute('src') || '').split('&quot;')[0].split('"')[0].trim();
    if (src) img.setAttribute('src', new URL(src, BASE).href);
    img.setAttribute('alt', '');
  });
  root.querySelectorAll('a').forEach((a) => {
    const h = a.getAttribute('href');
    if (h && !h.startsWith('#') && !h.startsWith('mailto:')) a.setAttribute('href', new URL(h, BASE).href);
  });
}

function toMd(el) {
  fixUrls(el);
  return td.turndown(el.innerHTML)
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/^[ \t ]+/gm, '') // відступи на старому сайті перетворювались би на блоки коду
    .replace(/[  ]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function get(path) {
  const r = await fetch(new URL(path, BASE));
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return parseHTML(await r.text()).document;
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

function fm(obj) {
  return '---\n' + Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'number' || typeof v === 'boolean' ? v : JSON.stringify(v)}`).join('\n') + '\n---\n\n';
}

async function save(path, content) {
  if (!FORCE && (await exists(path))) { console.log('  пропущено (вже є):', path); return; }
  await writeFile(path, content, 'utf8');
  console.log('  збережено:', path);
}

async function importPages() {
  await mkdir('src/content/pages', { recursive: true });
  for (const p of PAGES) {
    const parts = [];
    for (const slug of p.from) {
      const doc = await get(`/uk/site/${slug}.html`);
      const el = doc.querySelector('[id^=article_page_content]');
      if (el) parts.push(toMd(el));
    }
    const { from, slug, ...meta } = p;
    await save(`src/content/pages/${slug}.md`, fm(meta) + parts.join('\n\n') + '\n');
  }
}

const MONTHS = { 'січ': 1, 'лют': 2, 'бер': 3, 'квіт': 4, 'трав': 5, 'черв': 6, 'лип': 7, 'серп': 8, 'вер': 9, 'жовт': 10, 'лист': 11, 'груд': 12 };
function parseDate(s) {
  const m = s.trim().match(/(\d{1,2})\s+([а-яіїєґ]+)\.?\s+(\d{4})/i);
  if (!m) return null;
  const key = Object.keys(MONTHS).find((k) => m[2].toLowerCase().startsWith(k));
  if (!key) return null;
  return `${m[3]}-${String(MONTHS[key]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

async function importNews() {
  await mkdir('src/content/news', { recursive: true });
  const ids = [];
  for (let page = 1; ids.length < NEWS_LIMIT; page++) {
    const doc = await get(page === 1 ? '/uk/news/' : `/uk/news/News_page/${page}`);
    const found = [...doc.querySelectorAll('a')].map((a) => (a.getAttribute('href') || '').match(/news-(\d+)-\d+/)?.[1]).filter(Boolean);
    const fresh = [...new Set(found)].filter((id) => !ids.includes(id));
    if (fresh.length === 0) break;
    ids.push(...fresh);
  }
  for (const id of ids.slice(0, NEWS_LIMIT)) {
    try {
      const doc = await get(`/uk/news-${id}-3126/`);
      const main = doc.querySelector('#main_content');
      const title = main.querySelector('h1')?.textContent.trim().replace(/\s+/g, ' ') ?? `Новина ${id}`;
      const date = parseDate(main.querySelector('.red')?.textContent ?? '') ?? '2000-01-01';
      const cont = main.querySelector('.cont');
      if (!cont) continue;
      fixUrls(cont);
      // Перша картинка стає обкладинкою, курсивний анонс дублює текст — прибираємо.
      const firstImg = cont.querySelector('img');
      const cover = firstImg?.getAttribute('src');
      firstImg?.remove();
      cont.querySelector(':scope > i')?.remove();
      const body = toMd(cont);
      const shortTitle = title.length > 140 ? title.slice(0, 137).replace(/\s+\S*$/, '') + '…' : title;
      await save(`src/content/news/${date}-${id}.md`, fm({ title: shortTitle, date, cover }) + body + '\n');
    } catch (e) {
      console.warn('  помилка в новині', id, e.message);
    }
  }
}

console.log('Сторінки…');
await importPages();
console.log(`Новини (до ${NEWS_LIMIT})…`);
await importNews();
console.log('Готово.');
