'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { formatEthiopianBirr } from '@/lib/shop'

type ProductRow = {
  id: string
  slug: string
  name: string
  category: string
  short_description: string | null
  price_etb: number
  stock_quantity: number
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const accessToken = session?.access_token
  if (!accessToken) {
    throw new Error('Missing session token.')
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export default function AdminShopProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)
      )
    })
  }, [products, query])

  const loadProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/shop/products', { headers, cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to load products.'))
      }

      setProducts((payload?.data ?? []) as ProductRow[])
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load products.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const deleteProduct = async (id: string) => {
    const ok = window.confirm('Delete this product? This action cannot be undone.')
    if (!ok) return

    setDeletingId(id)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/shop/products/${id}`, {
        method: 'DELETE',
        headers,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to delete product.'))
      }

      setProducts((previous) => previous.filter((product) => product.id !== id))
    } catch (err: any) {
      alert(err?.message ?? 'Unable to delete product.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5 lg:pl-10 xl:pl-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop Products</h1>
          <p className="text-sm text-muted-foreground">Manage products, pricing, and inventory.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/shop/orders">View Orders</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/shop/new">+ New Product</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>{products.length} total products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product name, slug, or category"
          />

          {loading ? <p className="text-sm text-muted-foreground">Loading products...</p> : null}
          {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!loading && !error && filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products found.</p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">/{product.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/shop/${product.id}`}>Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteProduct(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{product.short_description || 'No short description.'}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                  <span>{product.category}</span>
                  <span>{formatEthiopianBirr(product.price_etb)}</span>
                  <span>Stock: {product.stock_quantity}</span>
                  <span>{product.is_active ? 'Active' : 'Inactive'}</span>
                  <span>{product.is_featured ? 'Featured' : 'Standard'}</span>
                  <span>{product.is_bestseller ? 'Bestseller' : 'Regular'}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
