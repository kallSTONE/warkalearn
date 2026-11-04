import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/api-auth'
import { registerLiveClass } from '@/lib/live-classes'

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

    const result = await registerLiveClass({
      userId: authResult.context.userId,
      liveClassId: params.id,
      paymentMethod,
      amountPaid: amountValue,
      paymentReference,
      notes,
    })

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

    return NextResponse.json(
      {
        error: `Unable to register: ${status}`,
        status,
        data: result,
      },
      { status: statusCode }
    )
  } catch (error: any) {
    console.error('Live class registration route error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Unable to register for the live class.' },
      { status: 500 }
    )
  }
}
