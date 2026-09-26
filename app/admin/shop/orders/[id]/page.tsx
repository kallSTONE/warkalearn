'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { formatEthiopianBirr } from '@/lib/shop'

type OrderDetail = {
  order: {
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
  items: Array<{
    id: string
    product_id: string
    product_name: string
    unit_price: number
    quantity: number
    line_total: number
    created_at: string
  }>
  customer: {
    id: string
    full_name: string | null
    role: string | null
  } | null
}

async function getAuthHeaders(contentType = false) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token
  if (!accessToken) throw new Error('Missing session token.')

  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  }
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('paid')
  const [savingStatus, setSavingStatus] = useState(false)

  const summary = useMemo(() => {
    const items = detail?.items ?? []
    return items.reduce(
      (acc, item) => {
        acc.itemCount += 1
        acc.quantityTotal += Number(item.quantity || 0)
        acc.lineTotal += Number(item.line_total || 0)
        return acc
      },
      { itemCount: 0, quantityTotal: 0, lineTotal: 0 }
    )
  }, [detail?.items])

  const loadDetail = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/shop/orders/${id}`, {
        headers,
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to load order.'))
      }

      const nextDetail = (payload?.data ?? null) as OrderDetail | null
      setDetail(nextDetail)
      setStatus(nextDetail?.order?.status ?? 'paid')
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load order.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  const updateStatus = async () => {
    if (!id) return

    setSavingStatus(true)
    try {
      const headers = await getAuthHeaders(true)
      const response = await fetch(`/api/admin/shop/orders/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to update status.'))
      }

      setDetail((previous) =>
        previous
          ? {
              ...previous,
              order: {
                ...previous.order,
                status,
              },
            }
          : previous
      )
    } catch (err: any) {
      alert(err?.message ?? 'Unable to update status.')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="space-y-5 lg:pl-10 xl:pl-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order Detail</h1>
          <p className="text-sm text-muted-foreground">Inspect line items and update payment status.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/shop/orders">Back to Orders</Link>
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading order...</p> : null}
      {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error && detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="text-sm font-medium break-all">{detail.order.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{detail.customer?.full_name || 'Unknown customer'}</p>
                  <p className="text-xs text-muted-foreground">User ID: {detail.order.user_id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{new Date(detail.order.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-medium">{formatEthiopianBirr(detail.order.total_amount)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Items: {summary.itemCount}</p>
                  <p>Total quantity: {summary.quantityTotal}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <Button onClick={updateStatus} disabled={savingStatus || status === detail.order.status}>
                    {savingStatus ? 'Saving...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No line items found for this order.</p>
              ) : null}

              {detail.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Product ID: {item.product_id}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: {formatEthiopianBirr(item.unit_price)}</span>
                      <span>Total: {formatEthiopianBirr(item.line_total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
