import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    cover: z.string().optional(),
    // Адмінка зберігає одне фото як рядок, кілька — як список. Приймаємо обидва варіанти.
    gallery: z
      .union([z.string(), z.array(z.string())])
      .nullish()
      .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : []).filter(Boolean)),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    section: z.enum(['pro-nas', 'batkam', 'dokumenty', 'novyny']),
    group: z.string().optional(),
    order: z.number().default(100),
    description: z.string().optional(),
  }),
});

export const collections = { news, pages };
