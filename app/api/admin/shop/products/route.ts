import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { requireAdminRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const authResult = await requireAdminRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const admin = getSupabaseAdminClient()
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').trim()

    let query = admin.from('shop_products').select('*')
    if (q) {
      query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      console.error('Admin products list error:', error)
      return NextResponse.json({ error: 'Unable to list products.' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 })
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

    const payload = {
      slug,
      name,
      short_description: body?.short_description ? String(body.short_description).trim() : null,
      description: body?.description ? String(body.description).trim() : null,
      category,
      image_url: body?.image_url ? String(body.image_url).trim() : null,
      price_etb: price,
      is_active: Boolean(body?.is_active ?? true),
      is_featured: Boolean(body?.is_featured ?? false),
      is_bestseller: Boolean(body?.is_bestseller ?? false),
      stock_quantity: Number(body?.stock_quantity ?? 0),
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin.from('shop_products').insert(payload).select('*').maybeSingle()

    if (error) {
      console.error('Admin products create error:', error)
      return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Admin products POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to create product.' }, { status: 500 })
  }
}
