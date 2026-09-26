'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CartSheet } from '@/components/shop/cart-sheet'
import { CheckoutModal } from '@/components/shop/checkout-modal'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useShopCart } from '@/hooks/useShopCart'
import { useToast } from '@/hooks/use-toast'
import { setPostLoginRedirect } from '@/lib/auth-redirect'
import type { ShopProduct } from '@/lib/shop'
import { formatEthiopianBirr } from '@/lib/shop'
import { Search, ShoppingCart, Filter, Star } from 'lucide-react'

type SortMode = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest'

export default function ShopPage() {
  const router = useRouter()
  const { user, supabase } = useSupabase()
  const { toast } = useToast()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortMode, setSortMode] = useState<SortMode>('featured')
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
    const fetchProducts = async () => {
      setLoadingProducts(true)
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching shop products:', error)
        toast({
          title: 'Could not load products',
          description: 'Please refresh and try again.',
          variant: 'destructive',
        })
        setProducts([])
        setLoadingProducts(false)
        return
      }

      setProducts(data || [])
      setLoadingProducts(false)
    }

    void fetchProducts()
  }, [supabase, toast])

  const categories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    }, {})

    return [{ name: 'All', count: products.length }].concat(
      Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }))
    )
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    let next = products.filter((product) => {
      if (selectedCategory !== 'All' && product.category !== selectedCategory) {
        return false
      }

      if (!query) return true

      return (
        product.name.toLowerCase().includes(query) ||
        (product.short_description || '').toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query)
      )
    })

    next = next.sort((a, b) => {
      switch (sortMode) {
        case 'price-low':
          return Number(a.price_etb) - Number(b.price_etb)
        case 'price-high':
          return Number(b.price_etb) - Number(a.price_etb)
        case 'rating':
          return Number(b.rating) - Number(a.rating)
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'featured':
        default:
          return Number(b.is_featured) - Number(a.is_featured)
      }
    })

    return next
  }, [products, search, selectedCategory, sortMode])

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      setPostLoginRedirect('/shop')
      toast({
        title: 'Login required',
        description: 'Please log in or sign up to add products to your cart.',
      })
      router.push('/login')
      return
    }

    try {
      await addItem(productId, 1)
      toast({
        title: 'Added to cart',
        description: 'Product added successfully.',
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

  const filtersContent = (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium">Categories</h4>
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.name}>
              <Button
                variant={selectedCategory === category.name ? 'secondary' : 'ghost'}
                className="w-full justify-between font-normal"
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
                <Badge variant="secondary" className="ml-auto">
                  {category.count}
                </Badge>
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSearch('')
            setSelectedCategory('All')
            setSortMode('featured')
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  )

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 font-montserrat text-3xl font-bold">Neway Learn Shop</h1>
          <p className="text-muted-foreground">Tools and resources to support your learning journey</p>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="hidden lg:block lg:w-1/4">
          <div className="sticky top-24 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search products"
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div>
              <h3 className="mb-3 flex items-center font-semibold">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </h3>
              {filtersContent}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-3/4">
          <div className="mb-6 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search products"
                      className="pl-10"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  {filtersContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">
              Products ({loadingProducts ? 0 : filteredProducts.length})
            </h2>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="featured">Sort by: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Rating: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {loadingProducts ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              No products found with the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
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

function ProductCard({
  product,
  onAddToCart,
}: {
  product: ShopProduct
  onAddToCart: (productId: string) => Promise<void>
}) {
  const price = Number(product.price_etb)
  const rating = Number(product.rating)

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-md">
      <Link href={`/shop/${product.slug}`} className="relative block aspect-square w-full overflow-hidden">
        <img
          src={product.image_url || 'https://placehold.co/600x600'}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />

        {product.is_bestseller && <Badge className="absolute left-3 top-3 bg-yellow-500">Bestseller</Badge>}
        {!product.is_bestseller && product.is_featured && (
          <Badge className="absolute left-3 top-3" variant="secondary">
            Featured
          </Badge>
        )}
      </Link>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1 text-xl">
          <Link href={`/shop/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>
        <div className="flex items-center gap-1">
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
          <span className="text-sm text-muted-foreground">({product.review_count})</span>
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-2">
        <p className="mb-2 line-clamp-3 text-sm text-muted-foreground">
          {product.short_description || product.description}
        </p>
        <Badge variant="outline">{product.category}</Badge>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <div className="text-lg font-bold">{formatEthiopianBirr(price)}</div>
        <Button size="sm" className="flex items-center gap-1" onClick={() => onAddToCart(product.id)}>
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  )
}