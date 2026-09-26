import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/server/supabase-admin'
import { authenticateRequest } from '@/lib/server/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json().catch(() => ({}))
    const paymentMethod = String(body?.payment_method ?? 'demo_checkout').trim() || 'demo_checkout'
    const paymentReference = body?.payment_reference ? String(body.payment_reference).trim() : null
    const notes = body?.notes ? String(body.notes).trim() : null

    const amountValue = body?.amount_paid === undefined || body?.amount_paid === null || body?.amount_paid === ''
      ? null
      : Number(body.amount_paid)

    if (amountValue !== null && (Number.isNaN(amountValue) || amountValue < 0)) {
      return NextResponse.json({ error: 'amount_paid must be a valid non-negative number.' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    console.log('[live-classes/register] user=', authResult.context.userId, 'live_class_id=', params.id, 'body=', body)
    const { data, error } = await admin.rpc('register_live_class', {
      p_user_id: authResult.context.userId,
      p_live_class_id: params.id,
      p_payment_method: paymentMethod,
      p_amount_paid: amountValue,
      p_payment_reference: paymentReference,
      p_notes: notes,
    })

    console.log('[live-classes/register] rpc result data=', data, 'error=', error)

    if (error) {
      console.error('Live class registration RPC error:', error)
      return NextResponse.json({ error: 'Unable to register for the live class.', details: error }, { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data
    const status = String(result?.status ?? '')

    if (status === 'registered' || status === 'already_registered') {
      return NextResponse.json({ data: result }, { status: status === 'registered' ? 201 : 200 })
    }

    const statusCode =
      status === 'registration_closed' || status === 'class_unavailable'
        ? 409
        : status === 'class_not_found'
          ? 404
          : status === 'insufficient_payment'
            ? 400
            : 400

    // Return the RPC status and full result to help debugging on the client
    return NextResponse.json({ error: status || 'Unable to register for the live class.', data: result }, { status: statusCode })
  } catch (error: any) {
    console.error('Live class register POST error:', error)
    return NextResponse.json({ error: error?.message ?? 'Unable to register for the live class.' }, { status: 500 })
  }
}
