'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { formatEthiopianBirr } from '@/lib/shop'

type OrderListItem = {
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
  customer_name: string
  item_count: number
  quantity_total: number
  line_total: number
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token
  if (!accessToken) throw new Error('Missing session token.')

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const statusSummary = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      const key = order.status || 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const loadOrders = async (status = '') => {
    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const query = status ? `?status=${encodeURIComponent(status)}` : ''
      const response = await fetch(`/api/admin/shop/orders${query}`, {
        headers,
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to load orders.'))
      }

      setOrders((payload?.data ?? []) as OrderListItem[])
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load orders.')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(statusFilter)
  }, [statusFilter])

  return (
    <div className="space-y-5 lg:pl-10 xl:pl-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop Orders</h1>
          <p className="text-sm text-muted-foreground">Track payment status and inspect line items.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/shop">Back to Products</Link>
          </Button>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="mt-1 text-xl font-semibold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="mt-1 text-xl font-semibold">{statusSummary.paid ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="mt-1 text-xl font-semibold">{statusSummary.cancelled ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Refunded</p>
            <p className="mt-1 text-xl font-semibold">{statusSummary.refunded ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Newest orders first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}
          {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found.</p>
          ) : null}

          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">User: {order.user_id.slice(0, 8)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:min-w-[280px]">
                  <span>Status: {order.status}</span>
                  <span>Items: {order.item_count}</span>
                  <span>Qty: {order.quantity_total}</span>
                  <span>Total: {formatEthiopianBirr(order.total_amount)}</span>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/shop/orders/${order.id}`}>View</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
