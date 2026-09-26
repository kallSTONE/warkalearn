import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type OrderRow = {
  id: string
  user_id: string
  status: string
  payment_method: string
  payment_reference: string | null
  currency: string
  subtotal: number
  total_amount: number
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type OrderItemRow = {
  order_id: string
  quantity: number
  line_total: number
}

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const url = new URL(request.url)
    const statusFilter = (url.searchParams.get('status') || '').trim().toLowerCase()

    let ordersQuery = admin.from('shop_orders').select('*')
    if (statusFilter) {
      ordersQuery = ordersQuery.eq('status', statusFilter)
    }

    const { data: orders, error: ordersError } = await ordersQuery.order('created_at', { ascending: false })
    if (ordersError) {
      console.error('Admin orders list error:', ordersError)
      return NextResponse.json({ error: 'Unable to load orders.' }, { status: 500 })
    }

    const orderRows = (orders ?? []) as OrderRow[]
    if (orderRows.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const userIds = Array.from(new Set(orderRows.map((order) => order.user_id)))
    const orderIds = orderRows.map((order) => order.id)

    const [profilesResult, itemsResult] = await Promise.all([
      admin.from('profiles').select('id, full_name').in('id', userIds).returns<ProfileRow[]>(),
      admin
        .from('shop_order_items')
        .select('order_id, quantity, line_total')
        .in('order_id', orderIds)
        .returns<OrderItemRow[]>(),
    ])

    if (profilesResult.error || itemsResult.error) {
      console.error('Admin orders linked query error:', profilesResult.error || itemsResult.error)
      return NextResponse.json({ error: 'Unable to load order details.' }, { status: 500 })
    }

    const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))

    const itemSummaryByOrderId = new Map<string, { itemCount: number; quantityTotal: number; lineTotal: number }>()
    ;(itemsResult.data ?? []).forEach((item) => {
      const current = itemSummaryByOrderId.get(item.order_id) ?? {
        itemCount: 0,
        quantityTotal: 0,
        lineTotal: 0,
      }

      current.itemCount += 1
      current.quantityTotal += Number(item.quantity || 0)
      current.lineTotal += Number(item.line_total || 0)
      itemSummaryByOrderId.set(item.order_id, current)
    })

    const data = orderRows.map((order) => {
      const profile = profileById.get(order.user_id)
      const itemSummary = itemSummaryByOrderId.get(order.id) ?? {
        itemCount: 0,
        quantityTotal: 0,
        lineTotal: 0,
      }

      return {
        ...order,
        customer_name: profile?.full_name || 'Unknown customer',
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