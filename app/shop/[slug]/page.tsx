'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSupabase } from '@/components/providers/supabase-provider'
import { CartSheet } from '@/components/shop/cart-sheet'
import { CheckoutModal } from '@/components/shop/checkout-modal'
import { useShopCart } from '@/hooks/useShopCart'
import { useToast } from '@/hooks/use-toast'
import { setPostLoginRedirect } from '@/lib/auth-redirect'
import type { ShopProduct } from '@/lib/shop'
import { formatEthiopianBirr } from '@/lib/shop'

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const slug = params?.slug
  const { user, supabase } = useSupabase()
  const { toast } = useToast()

  const [product, setProduct] = useState<ShopProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const {
    items: cartItems,
    totals,
    loading: cartLoading,
    addItem,
    updateQuantity,
    removeItem,
    checkout,
  } = useShopCart({
    supabase,
    userId: user?.id,
  })

  useEffect(() => {
    if (!slug) return

    const fetchProduct = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error loading product:', error)
        setProduct(null)
        setLoading(false)
        return
      }

      setProduct(data)
      setLoading(false)
    }

    void fetchProduct()
  }, [slug, supabase])

  const handleAddToCart = async () => {
    if (!product) return

    if (!user) {
      setPostLoginRedirect(pathname ?? `/shop/${slug}`)
      toast({
        title: 'Login required',
        description: 'Please log in or sign up to add products to your cart.',
      })
      router.push('/login')
      return
    }

    try {
      await addItem(product.id, quantity)
      toast({
        title: 'Added to cart',
        description: `${quantity} item(s) added successfully.`,
      })
      setCartOpen(true)
    } catch (error: any) {
      toast({
        title: 'Could not add to cart',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCheckoutConfirm = async () => {
    setCheckingOut(true)

    try {
      const orderId = await checkout()
      toast({
        title: 'Purchase completed',
        description: `Demo order created: ${orderId}`,
      })
      setCartOpen(false)
    } catch (error: any) {
      toast({
        title: 'Checkout failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
      throw error
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="container px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Loading product...
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h1 className="text-xl font-semibold">Product not found</h1>
          <p className="mt-2 text-muted-foreground">This product may be unavailable.</p>
          <Button className="mt-6" asChild>
            <Link href="/shop">Back to shop</Link>
          </Button>
        </div>
      </div>
    )
  }

  const rating = Number(product.rating)

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to shop
          </Link>
        </Button>

        <Button variant="outline" onClick={() => setCartOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Cart ({totals.items})
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-xl border">
          <img
            src={product.image_url || 'https://placehold.co/1200x900'}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              {product.is_bestseller && <Badge className="bg-yellow-500">Bestseller</Badge>}
              {product.is_featured && <Badge variant="secondary">Featured</Badge>}
              <Badge variant="outline">{product.category}</Badge>
            </div>

            <h1 className="mt-4 text-3xl font-bold font-montserrat">{product.name}</h1>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < Math.floor(rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : index < rating
                          ? 'fill-yellow-400/50 text-yellow-400'
                          : 'fill-muted text-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{product.review_count} reviews</span>
            </div>

            <p className="mt-4 text-muted-foreground">{product.description || product.short_description}</p>

            <div className="mt-6 flex items-center justify-between rounded-lg bg-muted/40 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-2xl font-bold">{formatEthiopianBirr(Number(product.price_etb))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">In stock</p>
                <p className="font-semibold">{product.stock_quantity}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="inline-flex w-full sm:w-auto items-center rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-r-none"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  -
                </Button>
                <span className="min-w-10 text-center">{quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-l-none"
                  onClick={() => setQuantity((current) => Math.min(product.stock_quantity || 1, current + 1))}
                >
                  +
                </Button>
              </div>

              <Button className="w-full sm:flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Demo checkout enabled. Real payment gateway is not connected yet.
            </p>
          </CardContent>
        </Card>
      </div>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartItems}
        subtotal={totals.subtotal}
        totalItems={totals.items}
        loading={cartLoading}
        checkingOut={checkingOut}
        onIncrease={(id, qty) => updateQuantity(id, qty + 1)}
        onDecrease={(id, qty) => updateQuantity(id, qty - 1)}
        onRemove={removeItem}
        onCheckout={() => {
          if (!user) {
            toast({ title: 'Login required', description: 'Please log in to checkout.' })
            return
          }
          setCheckoutOpen(true)
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalAmount={totals.subtotal}
        onConfirm={handleCheckoutConfirm}
      />
    </div>
  )
}
