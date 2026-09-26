import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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
    const { data, error } = await admin.from('shop_products').select('*').eq('id', params.id).maybeSingle()

    if (error) {
      console.error('Admin product get error:', error)
      return NextResponse.json({ error: 'Unable to load product.' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }

    return NextResponse.json({ data }, { status: 200 })
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
    const updateData: Record<string, any> = {
      slug: body?.slug,
      name: body?.name,
      short_description: body?.short_description,
      description: body?.description,
      category: body?.category,
      image_url: body?.image_url,
      price_etb: typeof body?.price_etb === 'undefined' ? undefined : Number(body.price_etb),
      is_active: typeof body?.is_active === 'undefined' ? undefined : Boolean(body.is_active),
      is_featured: typeof body?.is_featured === 'undefined' ? undefined : Boolean(body.is_featured),
      is_bestseller: typeof body?.is_bestseller === 'undefined' ? undefined : Boolean(body.is_bestseller),
      stock_quantity: typeof body?.stock_quantity === 'undefined' ? undefined : Number(body.stock_quantity),
    }

    // Remove undefined so partial updates are safe.
    Object.keys(updateData).forEach((key) => {
      if (typeof updateData[key] === 'undefined') {
        delete updateData[key]
      }
    })

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('shop_products')
      .update(updateData)
      .eq('id', params.id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('Admin product update error:', error)
      return NextResponse.json({ error: 'Unable to update product.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Admin product PUT route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to update product.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const { error } = await admin.from('shop_products').delete().eq('id', params.id)

    if (error) {
      console.error('Admin product delete error:', error)
      return NextResponse.json({ error: 'Unable to delete product.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error: any) {
    console.error('Admin product DELETE route error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to delete product.' }, { status: 500 })
  }
}
