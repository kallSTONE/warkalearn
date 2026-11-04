import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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

type RouteContext = {
  params: {
    slug: string
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const slug = params?.slug

    const [product] = await db
      .select()
      .from(shopProducts)
      .where(and(eq(shopProducts.slug, slug), eq(shopProducts.isActive, true)))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ data: formatProduct(product) }, { status: 200 })
  } catch (error: any) {
    console.error('Shop product GET by slug error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load product' }, { status: 500 })
  }
}

