import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopProducts } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { desc, or, ilike, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').trim()

    let query = db.select().from(shopProducts)
    let rows: (typeof shopProducts.$inferSelect)[]

    if (q) {
      const searchPattern = `%${q}%`
      rows = await db
        .select()
        .from(shopProducts)
        .where(
          or(
            ilike(shopProducts.name, searchPattern),
            ilike(shopProducts.slug, searchPattern),
            ilike(shopProducts.category, searchPattern)
          )
        )
        .orderBy(desc(shopProducts.createdAt))
    } else {
      rows = await db
        .select()
        .from(shopProducts)
        .orderBy(desc(shopProducts.createdAt))
    }

    return NextResponse.json({ data: rows.map(formatProduct) }, { status: 200 })
  } catch (error: any) {
    console.error('Admin products GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to list products.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()

    const slug = String(body?.slug ?? '').trim()
    const name = String(body?.name ?? '').trim()
    const category = String(body?.category ?? '').trim()
    const price = Number(body?.price_etb)

    if (!slug || !name || !category || Number.isNaN(price)) {
      return NextResponse.json(
        { error: 'slug, name, category, and price_etb are required.' },
        { status: 400 }
      )
    }

    const [inserted] = await db
      .insert(shopProducts)
      .values({
        slug,
        name,
        shortDescription: body?.short_description ? String(body.short_description).trim() : null,
        description: body?.description ? String(body.description).trim() : null,
        category,
        imageUrl: body?.image_url ? String(body.image_url).trim() : null,
        priceEtb: String(price),
        isActive: Boolean(body?.is_active ?? true),
        isFeatured: Boolean(body?.is_featured ?? false),
        isBestseller: Boolean(body?.is_bestseller ?? false),
        stockQuantity: Number(body?.stock_quantity ?? 0),
      })
      .returning()

    return NextResponse.json({ data: formatProduct(inserted) }, { status: 201 })
  } catch (error: any) {
    console.error('Admin products POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to create product.' }, { status: 500 })
  }
}
