import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopProducts } from '@/db/schema'
import { desc, eq, and, or, ilike } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatProduct(p: typeof shopProducts.$inferSelect) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short_description: p.shortDescription,
    description: p.description,
    category: p.category,
    image_url: p.imageUrl,
    price_etb: Number(p.priceEtb),
    rating: Number(p.rating),
    review_count: p.reviewCount,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    is_bestseller: p.isBestseller,
    stock_quantity: p.stockQuantity,
    created_at: p.createdAt?.toISOString(),
    updated_at: p.updatedAt?.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const category = (url.searchParams.get('category') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()

    const conditions = [eq(shopProducts.isActive, true)]

    if (category && category !== 'All') {
      conditions.push(eq(shopProducts.category, category))
    }

    if (q) {
      const searchPattern = `%${q}%`
      conditions.push(
        or(
          ilike(shopProducts.name, searchPattern),
          ilike(shopProducts.slug, searchPattern),
          ilike(shopProducts.description, searchPattern)
        )!
      )
    }

    const rows = await db
      .select()
      .from(shopProducts)
      .where(and(...conditions))
      .orderBy(desc(shopProducts.createdAt))

    return NextResponse.json({ data: rows.map(formatProduct) }, { status: 200 })
  } catch (error: any) {
    console.error('Shop products GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load products' }, { status: 500 })
  }
}

