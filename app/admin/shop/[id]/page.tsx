'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import ProductForm, { ProductFormValue } from '@/components/admin/shop/product-form'

type ProductRow = {
  id: string
  slug: string
  name: string
  short_description: string | null
  description: string | null
  category: string
  image_url: string | null
  price_etb: number
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  stock_quantity: number
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

export default function AdminEditProductPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [product, setProduct] = useState<ProductRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formInitialValue = product
    ? {
        ...product,
        short_description: product.short_description ?? undefined,
        description: product.description ?? undefined,
        image_url: product.image_url ?? undefined,
      }
    : undefined

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/admin/shop/products/${id}`, {
          headers,
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(String(payload?.error ?? 'Unable to load product.'))
        }

        setProduct((payload?.data ?? null) as ProductRow | null)
      } catch (err: any) {
        setError(err?.message ?? 'Unable to load product.')
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const onSubmit = async (value: ProductFormValue) => {
    if (!id) return
    setSaving(true)

    try {
      const headers = await getAuthHeaders(true)
      const response = await fetch(`/api/admin/shop/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(value),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to update product.'))
      }

      router.push('/admin/shop')
    } catch (err: any) {
      alert(err?.message ?? 'Unable to update product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 lg:pl-10 xl:pl-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Product</h1>
        <Button asChild variant="outline">
          <Link href="/admin/shop">Back to Products</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading product...</p> : null}
          {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && product ? (
            <ProductForm initialValue={formInitialValue} onSubmit={onSubmit} saving={saving} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
