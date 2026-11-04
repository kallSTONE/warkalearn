import { db } from '@/db'
import { liveClasses, liveClassRegistrations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function registerLiveClass({
  userId,
  liveClassId,
  paymentMethod = 'demo_checkout',
  amountPaid,
  paymentReference,
  notes,
}: {
  userId: string
  liveClassId: string
  paymentMethod?: string
  amountPaid?: number | null
  paymentReference?: string | null
  notes?: string | null
}) {
  return await db.transaction(async (tx) => {
    const [liveClass] = await tx
      .select()
      .from(liveClasses)
      .where(eq(liveClasses.id, liveClassId))
      .limit(1)

    if (!liveClass) {
      return { status: 'class_not_found', registration_id: null, live_class_id: null, amount_paid: null }
    }

    if (liveClass.status !== 'published') {
      return { status: 'class_unavailable', registration_id: null, live_class_id: liveClass.id, amount_paid: null }
    }

    if (liveClass.registrationStatus !== 'open') {
      return { status: 'registration_closed', registration_id: null, live_class_id: liveClass.id, amount_paid: null }
    }

    const [existing] = await tx
      .select()
      .from(liveClassRegistrations)
      .where(
        and(
          eq(liveClassRegistrations.liveClassId, liveClassId),
          eq(liveClassRegistrations.userId, userId)
        )
      )
      .limit(1)

    const classPrice = Number(liveClass.price ?? 0)
    const effectivePaid = amountPaid !== null && amountPaid !== undefined ? amountPaid : classPrice

    if (existing) {
      return {
        status: 'already_registered',
        registration_id: existing.id,
        live_class_id: liveClass.id,
        amount_paid: effectivePaid,
      }
    }

    if (effectivePaid < classPrice) {
      return {
        status: 'insufficient_payment',
        registration_id: null,
        live_class_id: liveClass.id,
        amount_paid: effectivePaid,
      }
    }

    const [reg] = await tx
      .insert(liveClassRegistrations)
      .values({
        liveClassId,
        userId,
        paymentStatus: 'paid',
        paymentMethod: paymentMethod || 'demo_checkout',
        paymentReference,
        amountPaid: String(effectivePaid),
        registrationStatus: 'registered',
        notes,
      })
      .returning()

    return {
      status: 'registered',
      registration_id: reg.id,
      live_class_id: liveClass.id,
      amount_paid: effectivePaid,
    }
  })
}

