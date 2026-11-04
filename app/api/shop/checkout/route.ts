import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopCartItems, shopProducts, shopOrders, shopOrderItems } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId
    const body = await request.json().catch(() => ({}))
    const paymentMethod = String(body?.paymentMethod || 'fake_checkout').trim()

    const orderId = await db.transaction(async (tx) => {
      // 1. Fetch user's cart items with product details
      const cartRows = await tx
        .select({
          cartItem: shopCartItems,
          product: shopProducts,
        })
        .from(shopCartItems)
        .leftJoin(shopProducts, eq(shopCartItems.productId, shopProducts.id))
        .where(eq(shopCartItems.userId, userId))

      if (cartRows.length === 0) {
        throw new Error('Cart is empty.')
      }

      // 2. Validate product availability and stock
      for (const { cartItem, product } of cartRows) {
        if (!product || !product.isActive) {
          throw new Error(`Product "${product?.name || 'Item'}" is currently unavailable.`)
        }
        if (product.stockQuantity < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stockQuantity}.`)
        }
      }

      // 3. Compute subtotal
      let subtotal = 0
      for (const { cartItem, product } of cartRows) {
        const linePrice = Number(product!.priceEtb) * cartItem.quantity
        subtotal += linePrice
      }
      const formattedTotal = subtotal.toFixed(2)

      // 4. Create shop order
      const [order] = await tx
        .insert(shopOrders)
        .values({
          userId,
          status: 'paid',
          paymentMethod,
          currency: 'ETB',
          subtotal: formattedTotal,
          totalAmount: formattedTotal,
        })
        .returning()

      // 5. Insert order items
      const orderItemsPayload = cartRows.map(({ cartItem, product }) => {
        const unitPrice = Number(product!.priceEtb).toFixed(2)
        const lineTotal = (Number(product!.priceEtb) * cartItem.quantity).toFixed(2)
        return {
          orderId: order.id,
          productId: product!.id,
          productName: product!.name,
          unitPrice,
          quantity: cartItem.quantity,
          lineTotal,
        }
      })

      await tx.insert(shopOrderItems).values(orderItemsPayload)

      // 6. Decrement stock for each purchased product
      for (const { cartItem } of cartRows) {
        await tx
          .update(shopProducts)
          .set({
            stockQuantity: sql`${shopProducts.stockQuantity} - ${cartItem.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(shopProducts.id, cartItem.productId))
      }

      // 7. Clear user's cart
      await tx.delete(shopCartItems).where(eq(shopCartItems.userId, userId))

      return order.id
    })

    return NextResponse.json({ success: true, orderId }, { status: 200 })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error?.message ?? 'Checkout failed' }, { status: 400 })
  }
}

