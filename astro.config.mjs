import { defineConfig } from 'astro/config';

// SITE_URL і BASE_PATH задає GitHub Actions під час публікації.
// Локально сайт працює з кореня "/".
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');

// Фото й файли, вставлені через адмінку, мають шляхи на кшталт /uploads/foto.jpg.
// Якщо сайт живе в підпапці (https://логін.github.io/назва-репозиторію/),
// додаємо цю підпапку до шляху, щоб фото не ламалися.
function prefixUploads() {
  const fix = (v) => (typeof v === 'string' && v.startsWith('/uploads/') ? base + v : v);
  const walk = (node) => {
    if (node.type === 'element' && node.properties) {
      node.properties.src = fix(node.properties.src);
      node.properties.href = fix(node.properties.href);
    }
    if (node.type === 'raw' && base) {
      node.value = node.value.replace(/(src|href)="\/uploads\//g, `$1="${base}/uploads/`);
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}

// Посилання на YouTube, що стоїть окремим рядком, перетворюється на вбудований плеєр.
// Так відео можна додати через адмінку: просто вставити посилання з кнопки «Поділитися».
function youtubeId(href) {
  const m = String(href).trim().match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i,
  );
  return m ? m[1] : null;
}
function youtubeEmbeds() {
  const isBlank = (n) => n.type === 'text' && !n.value.trim();
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'p') {
      const kids = (node.children ?? []).filter((n) => !isBlank(n));
      if (kids.length === 1) {
        const k = kids[0];
        const href = k.type === 'element' && k.tagName === 'a' ? k.properties?.href : k.type === 'text' ? k.value : null;
        const id = href && youtubeId(href);
        if (id) {
          node.tagName = 'div';
          node.properties = { className: ['video'] };
          node.children = [{
            type: 'element', tagName: 'iframe', children: [],
            properties: {
              src: `https://www.youtube.com/embed/${id}`, loading: 'lazy', allowFullScreen: true, title: 'Відео',
              allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            },
          }];
          return;
        }
      }
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}

// Посилання на інші сайти (Google Drive, Docs тощо) і на файли (PDF, Word, Excel)
// у текстах сторінок і новин відкриваються в новій вкладці.
const ownHost = 'krasivske-school.github.io';
function linksInNewTab() {
  const isFile = (h) => /\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip|rar)(\?|#|$)/i.test(h);
  const isExternal = (h) => /^https?:\/\//i.test(h) && !h.includes(ownHost);
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a' && node.properties) {
      const h = String(node.properties.href ?? '');
      if (isExternal(h) || isFile(h)) {
        node.properties.target = '_blank';
        node.properties.rel = ['noopener', 'noreferrer'];
      }
    }
    if (node.type === 'raw') {
      // посилання, записані HTML-кодом прямо в тексті
      node.value = node.value.replace(/<a\s+(?![^>]*\starget=)([^>]*href="(?:https?:\/\/(?!krasivske-school\.github\.io)[^"]+|[^"]+\.(?:pdf|docx?|xlsx?))"[^>]*)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base: process.env.BASE_PATH || '/',
  markdown: { rehypePlugins: [youtubeEmbeds, prefixUploads, linksInNewTab] },
});
