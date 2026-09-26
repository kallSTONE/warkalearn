'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import ProductForm, { ProductFormValue } from '@/components/admin/shop/product-form'

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

export default function AdminNewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const onSubmit = async (value: ProductFormValue) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders(true)
      const response = await fetch('/api/admin/shop/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(value),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(String(payload?.error ?? 'Unable to create product.'))
      }

      router.push('/admin/shop')
    } catch (error: any) {
      alert(error?.message ?? 'Unable to create product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 lg:pl-10 xl:pl-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Product</h1>
        <Button asChild variant="outline">
          <Link href="/admin/shop">Back to Products</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={onSubmit} saving={saving} />
        </CardContent>
      </Card>
    </div>
  )
}
