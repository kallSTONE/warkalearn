'use client'

import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { ShopCartItem } from '@/lib/shop'
import { formatEthiopianBirr } from '@/lib/shop'

type CartSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ShopCartItem[]
  subtotal: number
  totalItems: number
  loading?: boolean
  checkingOut?: boolean
  onIncrease: (itemId: string, currentQty: number) => Promise<void>
  onDecrease: (itemId: string, currentQty: number) => Promise<void>
  onRemove: (itemId: string) => Promise<void>
  onCheckout: () => void
}

export function CartSheet({
  open,
  onOpenChange,
  items,
  subtotal,
  totalItems,
  loading,
  checkingOut,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
}: CartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[90vw] sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your Cart ({totalItems})</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex h-[calc(100vh-14rem)] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading cart...</p>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              </div>
            ) : (
              items.map((item) => {
                const product = item.shop_products
                if (!product) return null

                return (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex gap-3">
                      <img
                        src={product.image_url || 'https://placehold.co/200x200'}
                        alt={product.name}
                        className="h-20 w-20 rounded-md object-cover"
                      />

                      <div className="flex-1">
                        <Link href={`/shop/${product.slug}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{formatEthiopianBirr(Number(product.price_etb))}</p>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onDecrease(item.id, item.quantity)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-7 text-center text-sm">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onIncrease(item.id, item.quantity)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onRemove(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-base font-semibold">{formatEthiopianBirr(subtotal)}</span>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={items.length === 0 || checkingOut}
              onClick={onCheckout}
            >
              {checkingOut ? 'Processing...' : 'Checkout'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Checkout is in demo mode and does not process real payments.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
