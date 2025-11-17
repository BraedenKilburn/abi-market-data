// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content'

// 2. Import loader(s)
import { file, glob } from 'astro/loaders'

// 3. Define your collection(s)
const catalog = defineCollection({
  loader: glob({
    base: '../',
    pattern: 'snapshots/*.json',
  }),
  schema: z.object({
    timestamp: z.number(),
    categories: z.record(
      z.string(),
      z.array(
        z.object({
          itemName: z.string(),
          price: z.number(),
          thumbHash: z.string(),
        }),
      ),
    ),
  }),
})

const displayMappings = defineCollection({
  loader: file('../mappings/display_mappings.json'),
  schema: z.string(),
})

// 4. Export a single `collections` object to register your collection(s)
export const collections = { catalog, displayMappings }
