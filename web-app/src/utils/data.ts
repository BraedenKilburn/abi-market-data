import type { CollectionEntry } from 'astro:content'

type Catalog = CollectionEntry<'catalog'>

/**
 * Converts an itemKey to a URL-safe slug
 * Format: "Category:ItemName#thumbHash" -> "category-itemname-thumbhash"
 */
export function itemKeyToSlug(itemKey: string): string {
  return itemKey
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/#/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Converts a slug back to an itemKey format
 * This is used to reconstruct the itemKey from the slug
 */
function slugToItemKey(slug: string, catalog: Catalog[]): string | null {
  // We need to search through the catalog to find the matching itemKey
  for (const snapshot of catalog) {
    for (const [categoryName, items] of Object.entries(snapshot.data.categories)) {
      for (const item of items) {
        const itemKey = `${categoryName}:${item.itemName}#${item.thumbHash}`
        if (itemKeyToSlug(itemKey) === slug) {
          return itemKey
        }
      }
    }
  }
  return null
}

/**
 * Creates a map of slug -> itemKey from all catalog entries
 */
export function getAllItemKeys(catalog: Catalog[]): Map<string, string> {
  const itemKeyMap = new Map<string, string>()
  const seenItemKeys = new Set<string>()

  for (const snapshot of catalog) {
    for (const [categoryName, items] of Object.entries(snapshot.data.categories)) {
      for (const item of items) {
        const itemKey = `${categoryName}:${item.itemName}#${item.thumbHash}`
        if (!seenItemKeys.has(itemKey)) {
          seenItemKeys.add(itemKey)
          const slug = itemKeyToSlug(itemKey)
          itemKeyMap.set(slug, itemKey)
        }
      }
    }
  }

  return itemKeyMap
}

interface PriceHistoryPoint {
  date: Date
  price: number
}

interface ProcessedItemData {
  itemKey: string
  category: string
  itemName: string
  displayName: string
  thumbHash: string
  priceHistory: PriceHistoryPoint[]
  currentPrice: number
}

/**
 * Processes item data from catalog and returns processed item information
 */
export function processItemData(
  catalog: Catalog[],
  displayMappingsMap: Map<string, string>,
  itemKey: string,
): ProcessedItemData | null {
  // Parse itemKey: "Category:ItemName#thumbHash"
  const [categoryAndItem, thumbHash] = itemKey.split('#')
  if (!categoryAndItem || !thumbHash) {
    return null
  }

  const [category, ...itemNameParts] = categoryAndItem.split(':')
  const itemName = itemNameParts.join(':')

  if (!category || !itemName) {
    return null
  }

  // Get display name from mappings
  const displayName = displayMappingsMap.get(itemKey) ?? itemName

  // Build price history from all snapshots
  const priceHistory: PriceHistoryPoint[] = []

  for (const snapshot of catalog) {
    const categoryData = snapshot.data.categories[category]
    if (!categoryData) continue

    const item = categoryData.find(
      (i) => i.itemName === itemName && i.thumbHash === thumbHash,
    )

    if (item) {
      priceHistory.push({
        date: new Date(snapshot.data.timestamp * 1000),
        price: item.price,
      })
    }
  }

  // Sort by date (oldest first)
  priceHistory.sort((a, b) => a.date.getTime() - b.date.getTime())

  if (priceHistory.length === 0) {
    return null
  }

  const currentPrice = priceHistory[priceHistory.length - 1].price

  return {
    itemKey,
    category,
    itemName,
    displayName,
    thumbHash,
    priceHistory,
    currentPrice,
  }
}
