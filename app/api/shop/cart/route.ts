import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopCartItems, shopProducts } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, and, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatProduct(p: typeof shopProducts.$inferSelect | null) {
  if (!p) return null
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
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId

    const rows = await db
      .select({
        cartItem: shopCartItems,
        product: shopProducts,
      })
      .from(shopCartItems)
      .leftJoin(shopProducts, eq(shopCartItems.productId, shopProducts.id))
      .where(eq(shopCartItems.userId, userId))
      .orderBy(desc(shopCartItems.createdAt))

    const items = rows.map(({ cartItem, product }) => ({
      id: cartItem.id,
      user_id: cartItem.userId,
      product_id: cartItem.productId,
      quantity: cartItem.quantity,
      created_at: cartItem.createdAt?.toISOString(),
      updated_at: cartItem.updatedAt?.toISOString(),
      shop_products: formatProduct(product),
    }))

    return NextResponse.json({ data: items }, { status: 200 })
  } catch (error: any) {
    console.error('Cart GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load cart' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId
    const body = await request.json()

    const productId = String(body?.productId ?? '').trim()
    const quantity = Math.max(1, Number(body?.quantity ?? 1))

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Check existing item in cart
    const [existing] = await db
      .select()
      .from(shopCartItems)
      .where(and(eq(shopCartItems.userId, userId), eq(shopCartItems.productId, productId)))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(shopCartItems)
        .set({
          quantity: existing.quantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(shopCartItems.id, existing.id))
        .returning()

      return NextResponse.json({ data: updated }, { status: 200 })
    }

    const [inserted] = await db
      .insert(shopCartItems)
      .values({
        userId,
        productId,
        quantity,
      })
      .returning()

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error: any) {
    console.error('Cart POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to add item to cart' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId
    const body = await request.json()

    const itemId = String(body?.itemId ?? '').trim()
    const quantity = Number(body?.quantity)

    if (!itemId || Number.isNaN(quantity)) {
      return NextResponse.json({ error: 'itemId and quantity are required' }, { status: 400 })
    }

    if (quantity <= 0) {
      await db
        .delete(shopCartItems)
        .where(and(eq(shopCartItems.id, itemId), eq(shopCartItems.userId, userId)))

      return NextResponse.json({ ok: true, deleted: true }, { status: 200 })
    }

    const [updated] = await db
      .update(shopCartItems)
      .set({
        quantity,
        updatedAt: new Date(),
      })
      .where(and(eq(shopCartItems.id, itemId), eq(shopCartItems.userId, userId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    console.error('Cart PATCH error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to update cart item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId
    const url = new URL(request.url)
    const itemId = url.searchParams.get('itemId') || (await request.json().catch(() => ({})))?.itemId

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    await db
      .delete(shopCartItems)
      .where(and(eq(shopCartItems.id, itemId), eq(shopCartItems.userId, userId)))

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: any) {
    console.error('Cart DELETE error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to remove cart item' }, { status: 500 })
  }
}

