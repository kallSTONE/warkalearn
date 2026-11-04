import { NextResponse } from 'next/server'
import { db } from '@/db'
import { courseEnrollments, courses, shopOrders, shopOrderItems, shopProducts } from '@/db/schema'
import { authenticateRequest } from '@/lib/server/api-auth'
import { eq, desc, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const userId = authResult.context.userId

    // 1. Fetch course enrollments with course details
    const enrollmentRows = await db
      .select({
        enrollmentId: courseEnrollments.id,
        enrolledAt: courseEnrollments.enrolledAt,
        amountPaid: courseEnrollments.amountPaid,
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseHeroImage: courses.heroImage,
        coursePrice: courses.price,
        courseIsPaid: courses.isPaid,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.enrolledAt))

    const paidEnrollments = enrollmentRows.map((e) => ({
      enrollment_id: String(e.enrollmentId),
      enrolled_at: e.enrolledAt?.toISOString() ?? new Date().toISOString(),
      amount_paid: Number(e.amountPaid ?? 0),
      course: {
        id: String(e.courseId),
        title: e.courseTitle,
        slug: e.courseSlug,
        hero_image: e.courseHeroImage,
        image_url: e.courseHeroImage,
        price: Number(e.coursePrice ?? 0),
        is_paid: Boolean(e.courseIsPaid),
      },
    }))

    // 2. Fetch shop orders
    const orders = await db
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.userId, userId))
      .orderBy(desc(shopOrders.createdAt))

    let formattedShopOrders: any[] = []

    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id)
      const orderItems = await db
        .select({
          id: shopOrderItems.id,
          orderId: shopOrderItems.orderId,
          productId: shopOrderItems.productId,
          productName: shopOrderItems.productName,
          unitPrice: shopOrderItems.unitPrice,
          quantity: shopOrderItems.quantity,
          lineTotal: shopOrderItems.lineTotal,
          productSlug: shopProducts.slug,
        })
        .from(shopOrderItems)
        .leftJoin(shopProducts, eq(shopOrderItems.productId, shopProducts.id))
        .where(inArray(shopOrderItems.orderId, orderIds))

      const itemsByOrderId = new Map<string, any[]>()
      orderItems.forEach((item) => {
        const list = itemsByOrderId.get(item.orderId) ?? []
        list.push({
          id: item.id,
          quantity: item.quantity,
          line_total: Number(item.lineTotal),
          product_name: item.productName,
          slug: item.productSlug ?? null,
        })
        itemsByOrderId.set(item.orderId, list)
      })

      formattedShopOrders = orders.map((o) => ({
        id: o.id,
        created_at: o.createdAt?.toISOString() ?? new Date().toISOString(),
        total_amount: Number(o.totalAmount),
        status: o.status,
        payment_method: o.paymentMethod,
        items: itemsByOrderId.get(o.id) ?? [],
      }))
    }

    return NextResponse.json(
      {
        enrollments: paidEnrollments,
        shopOrders: formattedShopOrders,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Orders GET error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to load orders' }, { status: 500 })
  }
}
