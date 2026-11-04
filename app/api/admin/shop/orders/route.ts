import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shopOrders, shopOrderItems, profiles } from '@/db/schema'
import { requireAdminRequest } from '@/lib/server/api-auth'
import { desc, eq, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const url = new URL(request.url)
    const statusFilter = (url.searchParams.get('status') || '').trim().toLowerCase()

    let ordersQuery = db.select().from(shopOrders)
    let orderRows: (typeof shopOrders.$inferSelect)[]

    if (statusFilter) {
      orderRows = await db
        .select()
        .from(shopOrders)
        .where(eq(shopOrders.status, statusFilter))
        .orderBy(desc(shopOrders.createdAt))
    } else {
      orderRows = await db
        .select()
        .from(shopOrders)
        .orderBy(desc(shopOrders.createdAt))
    }

    if (orderRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const userIds = Array.from(new Set(orderRows.map((o) => o.userId)))
    const orderIds = orderRows.map((o) => o.id)

    const [userProfiles, orderItems] = await Promise.all([
      db.select({ id: profiles.id, fullName: profiles.fullName }).from(profiles).where(inArray(profiles.id, userIds)),
      db.select().from(shopOrderItems).where(inArray(shopOrderItems.orderId, orderIds)),
    ])

    const profileById = new Map(userProfiles.map((p) => [p.id, p]))

    const itemSummaryByOrderId = new Map<string, { itemCount: number; quantityTotal: number; lineTotal: number }>()
    orderItems.forEach((item) => {
      const current = itemSummaryByOrderId.get(item.orderId) ?? {
        itemCount: 0,
        quantityTotal: 0,
        lineTotal: 0,
      }
      current.itemCount += 1
      current.quantityTotal += Number(item.quantity || 0)
      current.lineTotal += Number(item.lineTotal || 0)
      itemSummaryByOrderId.set(item.orderId, current)
    })

    const data = orderRows.map((order) => {
      const profile = profileById.get(order.userId)
      const itemSummary = itemSummaryByOrderId.get(order.id) ?? {
        itemCount: 0,
        quantityTotal: 0,
        lineTotal: 0,
      }

      return {
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
        customer_name: profile?.fullName ?? null,
        item_count: itemSummary.itemCount,
        quantity_total: itemSummary.quantityTotal,
        line_total: itemSummary.lineTotal,
      }
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin orders GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to load orders.' }, { status: 500 })
  }
}
