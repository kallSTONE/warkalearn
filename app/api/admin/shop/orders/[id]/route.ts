import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const ALLOWED_STATUSES = new Set(['paid', 'cancelled', 'refunded'])

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { id } = params

    const { data: order, error: orderError } = await admin
      .from('shop_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (orderError) {
      console.error('Admin order detail error:', orderError)
      return NextResponse.json({ error: 'Unable to load order.' }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    const [{ data: items, error: itemsError }, { data: profile, error: profileError }] = await Promise.all([
      admin
        .from('shop_order_items')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true }),
      admin
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', order.user_id)
        .maybeSingle(),
    ])

    if (itemsError || profileError) {
      console.error('Admin order linked detail error:', itemsError || profileError)
      return NextResponse.json({ error: 'Unable to load order items.' }, { status: 500 })
    }

    return NextResponse.json(
      {
        data: {
          order,
          items: items ?? [],
          customer: profile ?? null,
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

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('shop_orders')
      .update({ status })
      .eq('id', params.id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Admin order status update error:', error)
      return NextResponse.json({ error: 'Unable to update order status.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin order PATCH route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update order.' }, { status: 500 })
  }
}
