'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatEthiopianBirr } from '@/lib/shop'

type CheckoutModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalAmount: number
  onConfirm: () => Promise<void>
}

export function CheckoutModal({ open, onOpenChange, totalAmount, onConfirm }: CheckoutModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')

  const cardIsValid = useMemo(() => {
    return cardName.trim().length >= 3 && cardNumber.replace(/\s/g, '').length >= 12
  }, [cardName, cardNumber])

  const handleConfirm = async () => {
    if (!cardIsValid) return

    setSubmitting(true)

    try {
      await onConfirm()
      onOpenChange(false)
      setCardName('')
      setCardNumber('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo Checkout</DialogTitle>
          <DialogDescription>
            This is a fake checkout flow for demo/testing. No real charge will be made.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">Cardholder name</Label>
            <Input
              id="card-name"
              placeholder="Jane Doe"
              value={cardName}
              onChange={(event) => setCardName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-number">Card number</Label>
            <Input
              id="card-number"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(event) => setCardNumber(event.target.value)}
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatEthiopianBirr(totalAmount)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!cardIsValid || submitting} onClick={handleConfirm}>
            {submitting ? 'Completing...' : 'Complete Purchase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
