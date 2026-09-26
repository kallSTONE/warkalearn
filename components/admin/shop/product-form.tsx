'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea' 

export type ProductFormValue = {
  slug: string
  name: string
  short_description: string
  description: string
  category: string
  image_url: string
  price_etb: number
  is_active: boolean
  is_featured: boolean
  is_bestseller: boolean
  stock_quantity: number
}

type ProductFormProps = {
  initialValue?: Partial<ProductFormValue>
  saving?: boolean
  onSubmit: (value: ProductFormValue) => Promise<void> | void
}
 
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

export default function ProductForm({ initialValue, saving = false, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormValue>({
    slug: initialValue?.slug ?? '',
    name: initialValue?.name ?? '',
    short_description: initialValue?.short_description ?? '',
    description: initialValue?.description ?? '',
    category: initialValue?.category ?? '',
    image_url: initialValue?.image_url ?? '',
    price_etb: Number(initialValue?.price_etb ?? 0),
    is_active: Boolean(initialValue?.is_active ?? true),
    is_featured: Boolean(initialValue?.is_featured ?? false),
    is_bestseller: Boolean(initialValue?.is_bestseller ?? false),
    stock_quantity: Number(initialValue?.stock_quantity ?? 0),
  })
  const [errors, setErrors] = useState<string[]>([]) 

  const canGenerateSlug = useMemo(() => !form.slug && !!form.name, [form.slug, form.name])

  const update = <K extends keyof ProductFormValue>(key: K, value: ProductFormValue[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: string[] = []
 
    if (!form.name.trim()) nextErrors.push('Product name is required.')
    if (!form.slug.trim()) nextErrors.push('Slug is required.')
    if (!form.category.trim()) nextErrors.push('Category is required.') 
    if (Number.isNaN(form.price_etb) || form.price_etb < 0) nextErrors.push('Price must be a valid number.')
    if (Number.isNaN(form.stock_quantity) || form.stock_quantity < 0)
      nextErrors.push('Stock quantity must be 0 or greater.') 
 
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors([])
    await onSubmit({
      ...form,
      slug: slugify(form.slug),
      name: form.name.trim(),
      category: form.category.trim(),
      short_description: form.short_description.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim(),
    })
  }
  
  return (
    <form className="space-y-5" onSubmit={handleSubmit}> 
      {errors.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name</Label>
          <Input
            id="product-name"
            value={form.name}
            onChange={(event) => {
              const nextName = event.target.value
              update('name', nextName)
              if (canGenerateSlug) {
                update('slug', slugify(nextName))
              }
            }}
            placeholder="Speaking Confidence Workbook"
            required
          />
        </div>
   
        <div className="space-y-2">
          <Label htmlFor="product-slug">Slug</Label>
          <Input
            id="product-slug"
            value={form.slug}
            onChange={(event) => update('slug', slugify(event.target.value))}
            placeholder="speaking-confidence-workbook"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Category</Label>  
          <Input
            id="product-category"
            value={form.category}
            onChange={(event) => update('category', event.target.value)}
            placeholder="Books"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-image-url">Image URL</Label>
          <Input
            id="product-image-url"
            value={form.image_url}
            onChange={(event) => update('image_url', event.target.value)}
            placeholder="https://..."
          />
        </div> 

        <div className="space-y-2">
          <Label htmlFor="product-price">Price (ETB)</Label>
          <Input
            id="product-price"
            type="number"
            step="0.01"
            min={0}
            value={String(form.price_etb)}
            onChange={(event) => update('price_etb', Number(event.target.value))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-stock">Stock Quantity</Label>
          <Input
            id="product-stock"
            type="number"
            min={0}
            value={String(form.stock_quantity)}
            onChange={(event) => update('stock_quantity', Number(event.target.value))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-short-description">Short Description</Label>
        <Input
          id="product-short-description"
          value={form.short_description}
          onChange={(event) => update('short_description', event.target.value)}
          placeholder="Guided prompts and reflection tasks."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          className="min-h-[120px]"
          placeholder="Long-form product details for the listing page."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 md:grid-cols-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Active</span>
          <Switch checked={form.is_active} onCheckedChange={(checked) => update('is_active', checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Featured</span>
          <Switch checked={form.is_featured} onCheckedChange={(checked) => update('is_featured', checked)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Bestseller</span>
          <Switch checked={form.is_bestseller} onCheckedChange={(checked) => update('is_bestseller', checked)} />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </form>
  )
}
