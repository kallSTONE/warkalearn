export type ShopProduct = {
  id: string
  slug: string
  name: string
  short_description: string | null
  description: string | null
  category: string
  image_url: string | null
  price_etb: number
  rating: number
  review_count: number
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  stock_quantity: number
  created_at?: string
  updated_at?: string
}

export type ShopCartItem = {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at?: string
  updated_at?: string
  shop_products: ShopProduct | null
}

export type ShopOrder = {
  id: string
  user_id: string
  status: string
  payment_method: string
  payment_reference: string | null
  currency: string
  subtotal: number
  total_amount: number
  created_at?: string
  updated_at?: string
}

export type ShopOrderItem = {
  id: string
  order_id: string
  product_id: string
  product_name: string
  unit_price: number
  quantity: number
  line_total: number
  created_at?: string
}

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
