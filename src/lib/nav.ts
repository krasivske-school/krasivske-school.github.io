// Посилання з урахуванням base (на GitHub Pages сайт може жити в /назва-репозиторію/).
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : '/' + path);
}

export const sections = [
  { id: 'pro-nas', title: 'Про нас', description: 'Історія, адміністрація, структура управління і вакансії.' },
  { id: 'batkam', title: 'Батькам', description: 'Вступ до 1 класу, поради психолога, правила поведінки і безпека дітей.' },
  { id: 'dokumenty', title: 'Документи', description: 'Статут, ліцензії, звіти, кошторис, атестація — публічна інформація закладу.' },
  { id: 'novyny', title: 'Новини', description: 'Події, свята, змагання і досягнення учнів.' },
  { id: 'kontakty', title: 'Контакти', description: 'Адреса, телефони і телефони довіри.' },
] as const;

export type SectionId = (typeof sections)[number]['id'];

export function sectionTitle(id: string): string {
  return sections.find((s) => s.id === id)?.title ?? '';
}

const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
export function formatDate(d: Date): string {
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
