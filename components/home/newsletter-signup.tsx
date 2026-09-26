'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { t } = useLanguage()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      // In a real app, you'd send this to your API
      console.log('Email submitted:', email)
      setIsSubmitted(true)
      setEmail('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-montserrat font-bold">{t('home.newsletter.title', 'Warka Learn updates')}</h2>
      <p className="mt-3 text-muted-foreground">
        {t(
          'home.newsletter.subtitle',
          'Get new course launches, tech tips, language resources, and career guides straight to your inbox.'
        )}
      </p>

      {isSubmitted ? (
        <div className="mt-8 inline-flex items-center border border-primary/20 bg-background/80 text-foreground px-4 py-3 rounded-lg">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <span>{t('home.newsletter.success', 'Thanks for subscribing. Please check your email to confirm.')}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder={t('footer.subscribe.placeholder', 'Your email address')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-background/90 border-primary/20 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
          />
          <Button
            type="submit"
            variant="secondary"
          >
            {t('footer.subscribe.button', 'Subscribe')}
          </Button>
        </form>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {t('home.newsletter.privacy', 'We respect your privacy. Unsubscribe anytime.')}
      </p>
    </div>
  )
}