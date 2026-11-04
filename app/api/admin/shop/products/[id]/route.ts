import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopProducts } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { eq } from 'drizzle-orm'

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

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const [product] = await db
      .select()
      .from(shopProducts)
      .where(eq(shopProducts.id, params.id))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }

    return NextResponse.json({ data: formatProduct(product) }, { status: 200 })
  } catch (error: any) {
    console.error('Admin product GET route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load product.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const updateValues: Partial<typeof shopProducts.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (typeof body?.slug !== 'undefined') updateValues.slug = String(body.slug).trim()
    if (typeof body?.name !== 'undefined') updateValues.name = String(body.name).trim()
    if (typeof body?.short_description !== 'undefined') {
      updateValues.shortDescription = body.short_description ? String(body.short_description).trim() : null
    }
    if (typeof body?.description !== 'undefined') {
      updateValues.description = body.description ? String(body.description).trim() : null
    }
    if (typeof body?.category !== 'undefined') updateValues.category = String(body.category).trim()
    if (typeof body?.image_url !== 'undefined') {
      updateValues.imageUrl = body.image_url ? String(body.image_url).trim() : null
    }
    if (typeof body?.price_etb !== 'undefined') updateValues.priceEtb = String(Number(body.price_etb))
    if (typeof body?.is_active !== 'undefined') updateValues.isActive = Boolean(body.is_active)
    if (typeof body?.is_featured !== 'undefined') updateValues.isFeatured = Boolean(body.is_featured)
    if (typeof body?.is_bestseller !== 'undefined') updateValues.isBestseller = Boolean(body.is_bestseller)
    if (typeof body?.stock_quantity !== 'undefined') updateValues.stockQuantity = Number(body.stock_quantity)

    const [updated] = await db
      .update(shopProducts)
      .set(updateValues)
      .where(eq(shopProducts.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }

    return NextResponse.json({ data: formatProduct(updated) }, { status: 200 })
  } catch (error: any) {
    console.error('Admin product PUT route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update product.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    await db.delete(shopProducts).where(eq(shopProducts.id, params.id))
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: any) {
    console.error('Admin product DELETE error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to delete product.' }, { status: 500 })
  }
}
