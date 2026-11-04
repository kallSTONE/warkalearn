'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ShopCartItem } from '@/lib/shop'
import { getCartTotals } from '@/lib/shop'

type UseShopCartArgs = {
  supabase?: any
  userId?: string
}

export function useShopCart({ userId }: UseShopCartArgs = {}) {
  const [items, setItems] = useState<ShopCartItem[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    if (!userId) {
      setItems([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/shop/cart', { cache: 'no-store' })
      if (!res.ok) {
        setItems([])
        return
      }
      const json = await res.json()
      setItems((json?.data as ShopCartItem[]) || [])
    } catch (err) {
      console.error('Failed to load cart:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshCart()
  }, [refreshCart])

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      if (!userId) {
        throw new Error('Please log in to add products to cart.')
      }

      const res = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || 'Failed to add item to cart.')
      }

      await refreshCart()
    },
    [refreshCart, userId]
  )

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!userId) {
        throw new Error('Please log in to update cart.')
      }

      const res = await fetch('/api/shop/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || 'Failed to update item.')
      }

      await refreshCart()
    },
    [refreshCart, userId]
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!userId) {
        throw new Error('Please log in to update cart.')
      }

      const res = await fetch(`/api/shop/cart?itemId=${itemId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || 'Failed to delete item.')
      }

      await refreshCart()
    },
    [refreshCart, userId]
  )

  const checkout = useCallback(async () => {
    if (!userId) {
      throw new Error('Please log in to checkout.')
    }

    const res = await fetch('/api/shop/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'fake_checkout' }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json?.error || 'Checkout failed.')
    }

    await refreshCart()
    return json?.orderId
  }, [refreshCart, userId])

  const totals = useMemo(() => getCartTotals(items), [items])

  return {
    items,
    totals,
    loading,
    refreshCart,
    addItem,
    updateQuantity,
    removeItem,
    checkout,
  }
}
