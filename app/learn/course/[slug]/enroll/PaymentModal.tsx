'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { useLanguage } from '@/components/providers/language-provider'

interface Course {
  title: string
  description: string
  hero_image?: string
  estimated_hours: number
  price?: number | null
} 

interface PaymentModalProps {
  open: boolean
  course: Course
  courseId: number
  onClose: () => void
  onPaymentSuccess: (amountPaid: number) => void
  onRewardCodeSuccess?: () => void
}

export default function PaymentModal({
  open,
  course,
  courseId,
  onClose,
  onPaymentSuccess,
  onRewardCodeSuccess,
}: PaymentModalProps) {
  const { supabase } = useSupabase()
  const { t } = useLanguage()
  const [step, setStep] = useState<'review' | 'payment' | 'processing' | 'success'>('review')
  const [showHalfPriceModal, setShowHalfPriceModal] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [isRedeemingCode, setIsRedeemingCode] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'telebirr' | 'chappa' | 'cbe-mobile' | 'cbe-birr'>(
    'telebirr'
  )
  const priceETB = Number(course.price ?? 3000)
  const formattedPrice = new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(priceETB)

  const paymentMethods = [
    { id: 'telebirr', name: '', file: 'Ethio Telecom Logo.svg' },
    { id: 'chappa', name: '', file: 'Chapa Logo.svg' },
    { id: 'cbe-mobile', name: 'CBE Mobile', file: 'Commercial Bank of Ethiopia Logo.png' },
    { id: 'cbe-birr', name: '', file: 'CBE Birr ( No background ) Logo.svg' },
  ] as const

  useEffect(() => {
    if (!open) {
      setStep('review')
      setSelectedMethod('telebirr')
      setShowHalfPriceModal(false)
      setDiscountCode('')
      setDiscountError(null)
      setIsRedeemingCode(false)
    }
  }, [open])

  const handleFakePayment = () => {
    setStep('processing')
    setTimeout(() => {
      setStep('success')
      setTimeout(() => {
        onPaymentSuccess(priceETB)
      }, 1200)
    }, 2000)
  }

  const handlePayOrRedeem = async () => {
    const normalizedCode = discountCode.trim().toUpperCase()
    if (!normalizedCode) {
      setDiscountError(null)
      handleFakePayment()
      return
    }

    setDiscountError(null)
    setIsRedeemingCode(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(t('payment.error.missingToken', 'Missing session token.'))
      }

      const response = await fetch('/api/referrals/reward-codes/redeem', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          code: normalizedCode,
          courseId,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error ?? t('payment.error.redeemFailed', 'Unable to redeem reward code.')))
      }

      setStep('success')
      setTimeout(() => {
        if (onRewardCodeSuccess) {
          onRewardCodeSuccess()
          return
        }

        onPaymentSuccess(0)
      }, 1200)
    } catch (error: any) {
      setDiscountError(error?.message ?? t('payment.error.redeemFailed', 'Unable to redeem reward code.'))
    } finally {
      setIsRedeemingCode(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('payment.title', 'Complete Enrollment')}</DialogTitle>
        </DialogHeader>

        {/* STEP 1: REVIEW */}
        {step === 'review' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <img
                  src={course.hero_image || '/assets/images/default.jpg'}
                  alt={course.title}
                  className="rounded-md h-32 w-full object-cover"
                />
                <h3 className="text-lg font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>

                <div className="flex justify-between text-sm mt-2">
                  <span>{t('payment.courseLength', 'Course Length')}</span>
                  <span>{course.estimated_hours} {t('payment.hours', 'hours')}</span>
                </div>

                <div className="flex justify-between font-semibold mt-2">
                  <span>{t('payment.total', 'Total')}</span>
                  <span>{formattedPrice}</span>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              {t('payment.secureNote', 'Secure demo payment - local methods, no real charges')}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('payment.localOptions', 'Local payment options')}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center gap-2 rounded-md bg-background px-2 py-1">
                    <img
                      src={encodeURI(`/assets/images/companyLogos/${method.file}`)}
                      alt={`${method.name} logo`}
                      className="h-6 w-auto object-contain"
                    />
                    <span className="text-xs text-muted-foreground">{method.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep('payment')}>
              {t('payment.action.proceed', 'Proceed to Payment')}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowHalfPriceModal(true)}
            >
              {t('payment.action.halfPrice', 'Join with Half the price')}
            </Button>
          </div>
        )}

        {/* STEP 2: PAYMENT FORM */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              {t('payment.chooseMethod', 'Choose a local payment method')}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition ${isSelected
                      ? 'border-blue-600 bg-blue-50/60 text-blue-900'
                      : 'border-muted bg-background hover:border-blue-300'
                      }`}
                    aria-pressed={isSelected}
                  >
                    <img
                      src={encodeURI(`/assets/images/companyLogos/${method.file}`)}
                      alt={`${method.name} logo`}
                      className="h-6 w-auto object-contain"
                    />
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                )
              })}
            </div>

            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('payment.field.mobile', 'Mobile number')}
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('payment.field.fullName', 'Full name')}
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder={t('payment.field.reference', 'Transaction reference (optional)')}
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">{t('payment.field.discount', 'Discount code (optional)')}</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder={t('payment.field.discountPlaceholder', 'Enter discount code if you have one')}
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value)
                  if (discountError) {
                    setDiscountError(null)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('payment.discountHint', 'Use a referral reward code here to unlock this course without payment.')}
              </p>
              {discountError ? (
                <p className="text-xs text-destructive">{discountError}</p>
              ) : null}
            </div>

            <Button className="w-full" onClick={handlePayOrRedeem} disabled={isRedeemingCode}>
              {isRedeemingCode
                ? t('payment.action.applyingCode', 'Applying reward code...')
                : discountCode.trim().length > 0
                  ? t('payment.action.applyCodeEnroll', 'Apply code and enroll')
                  : `${t('payment.action.pay', 'Pay')} ${formattedPrice}`}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep('review')}
            >
              {t('payment.action.back', 'Back')}
            </Button>
          </div>
        )}

        {/* STEP 3: PROCESSING */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-8 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-sm">{t('payment.processing', 'Processing payment...')}</p>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-8 space-y-2 text-green-600">
            <CheckCircle2 className="w-8 h-8" />
            <p className="font-semibold">{t('payment.success.title', 'Payment Successful!')}</p>
            <p className="text-sm text-muted-foreground">
              {t('payment.success.subtitle', 'Enrolling you now...')}
            </p>
          </div>
        )}

        <AlertDialog open={showHalfPriceModal} onOpenChange={setShowHalfPriceModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="text-4xl text-center">😞</div>
              <AlertDialogTitle className="text-center">{t('payment.halfPrice.title', 'Not available for this course')}</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {t('payment.halfPrice.description', 'Half-price joining is not available for this course right now.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowHalfPriceModal(false)}>
                {t('payment.action.goBack', 'Go back')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
