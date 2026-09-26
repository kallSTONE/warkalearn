import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type ShopProduct = Database['public']['Tables']['shop_products']['Row']
export type ShopCartItem = Database['public']['Tables']['shop_cart_items']['Row'] & {
  shop_products: ShopProduct | null
}
 
export type ShopOrder = Database['public']['Tables']['shop_orders']['Row']
export type ShopOrderItem = Database['public']['Tables']['shop_order_items']['Row']
 
export const formatEthiopianBirr = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '0 ETB'
 
  try { 
    return new Intl.NumberFormat('en-ET', {
      style: 'currency', 
      currency: 'ETB', 
      maximumFractionDigits: 2,
    }).format(amount) 
  } catch {
    return `${amount} ETB`
  }
}   

export const getCartTotals = (items: ShopCartItem[]) => {
  return items.reduce(
    (acc, item) => {
      const linePrice = Number(item.shop_products?.price_etb ?? 0) * item.quantity
      acc.items += item.quantity
      acc.subtotal += linePrice
      return acc
    },
    { items: 0, subtotal: 0 }
  )
}

export const upsertToCart = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  productId: string,
  quantity = 1
) => {
  const { data: existing, error: existingError } = await supabase
    .from('shop_cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('shop_cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)

    if (updateError) {
      throw updateError
    }

    return
  }

  const { error: insertError } = await supabase.from('shop_cart_items').insert({
    user_id: userId,
    product_id: productId,
    quantity,
  })   
    
  if (insertError) {
    throw insertError
  }   
}      
  