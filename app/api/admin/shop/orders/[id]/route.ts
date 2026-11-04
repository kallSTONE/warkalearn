import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopOrders, shopOrderItems, profiles } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { asc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const ALLOWED_STATUSES = new Set(['paid', 'cancelled', 'refunded', 'delivered', 'pending'])

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const { id } = params

    const [order] = await db
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.id, id))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    const [items, [customer]] = await Promise.all([
      db
        .select()
        .from(shopOrderItems)
        .where(eq(shopOrderItems.orderId, id))
        .orderBy(asc(shopOrderItems.createdAt)),
      db
        .select({
          id: profiles.id,
          full_name: profiles.fullName,
          role: profiles.role,
        })
        .from(profiles)
        .where(eq(profiles.id, order.userId))
        .limit(1),
    ])

    return NextResponse.json(
      {
        data: {
          order: {
            id: order.id,
            user_id: order.userId,
            status: order.status,
            payment_method: order.paymentMethod,
            payment_reference: order.paymentReference,
            currency: order.currency,
            subtotal: Number(order.subtotal),
            total_amount: Number(order.totalAmount),
            created_at: order.createdAt?.toISOString(),
            updated_at: order.updatedAt?.toISOString(),
          },
          items: items.map((it) => ({
            id: it.id,
            order_id: it.orderId,
            product_id: it.productId,
            product_name: it.productName,
            unit_price: Number(it.unitPrice),
            quantity: it.quantity,
            line_total: Number(it.lineTotal),
            created_at: it.createdAt?.toISOString(),
          })),
          customer: customer ?? null,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admin order GET route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load order.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const status = String(body?.status ?? '').trim().toLowerCase()

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 })
    }

    const [updated] = await db
      .update(shopOrders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(shopOrders.id, params.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    console.error('Admin order status update error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update order status.' }, { status: 500 })
  }
}
