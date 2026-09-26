'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ShopCartItem } from '@/lib/shop'
import { getCartTotals, upsertToCart } from '@/lib/shop'
 
type UseShopCartArgs = {
  supabase: SupabaseClient<Database>
  userId?: string
}

export function useShopCart({ supabase, userId }: UseShopCartArgs) {
  const [items, setItems] = useState<ShopCartItem[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    if (!userId) {
      setItems([])
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('shop_cart_items')
      .select(
        `
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        updated_at,
        shop_products (*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load cart:', error)
      setItems([])
      setLoading(false)
      return
    }

    setItems((data as ShopCartItem[]) || [])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    void refreshCart()
  }, [refreshCart])

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      if (!userId) {
        throw new Error('Please log in to add products to cart.')
      }

      await upsertToCart(supabase, userId, productId, quantity)
      await refreshCart()
    },
    [refreshCart, supabase, userId]
  ) 

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!userId) {
        throw new Error('Please log in to update cart.')
      }
 
      if (quantity <= 0) {
        const { error } = await supabase.from('shop_cart_items').delete().eq('id', itemId)
        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase
          .from('shop_cart_items')
          .update({ quantity })
          .eq('id', itemId)
          .eq('user_id', userId)

        if (error) {
          throw error
        }
      }

      await refreshCart()
    },
    [refreshCart, supabase, userId]
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!userId) {
        throw new Error('Please log in to update cart.')
      }

      const { error } = await supabase
        .from('shop_cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId)

      if (error) {
        throw error
      }
 
      await refreshCart()
    },
    [refreshCart, supabase, userId]
  )

  const checkout = useCallback(async () => {
    if (!userId) {
      throw new Error('Please log in to checkout.')
    }

    const { data, error } = await supabase.rpc('checkout_shop_cart', {
      p_payment_method: 'fake_checkout',
    })

    if (error) {
      throw error
    }

    await refreshCart()
    return data
  }, [refreshCart, supabase, userId])

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
