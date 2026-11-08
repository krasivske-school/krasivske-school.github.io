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

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.github.io',
  base: process.env.BASE_PATH || '/',
  markdown: { rehypePlugins: [prefixUploads] },
});
