"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollAreaViewport } from "@/components/ui/scroll-area" // adjust import if your ScrollArea exports a viewport
import { PanelRightClose, PanelRightOpen, Send } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
}

export function TesfaAssistant() {
  const { locale } = useLanguage()
  const t = (key: string, fallback?: string) => translate(locale, key, fallback)
  const [isOpen, setIsOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: t("assistant.welcome", "Hi, I'm Tesfa AI. I can help with course explanations and extra practice."),
      sender: "assistant",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  // Attach ref to the viewport (the actual scrollable element)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      // ensure scroll after DOM update
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          t("assistant.defaultReply", "Thanks for your question! I can help you understand this concept better. What specific part would you like me to explain?"),
        sender: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card
      className={`flex h-full flex-col overflow-hidden border-l rounded-none shadow-none bg-card transition-[width] duration-200 ${isOpen ? "w-80" : "w-12"
        } shrink-0`}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        {isOpen ? (
          <div className="text-sm font-semibold text-primary">{t('assistant.title', 'Tesfa AI Assistant')}</div>
        ) : (
          <span className="sr-only">{t('assistant.title', 'Tesfa AI Assistant')}</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-pressed={!isOpen}
          aria-label={isOpen ? t('assistant.collapse', 'Collapse assistant') : t('assistant.expand', 'Expand assistant')}
        >
          {isOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <>
          {/* Scroll area fills the remaining vertical space */}
          <ScrollArea className="flex-1">
            {/* IMPORTANT: put ref on the viewport (the inner scroll element) */}
            <ScrollAreaViewport ref={scrollRef} className="p-4 flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs rounded-lg px-3 py-2 my-2 text-sm ${message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </ScrollAreaViewport>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              placeholder={t('assistant.placeholder', 'Ask a question...')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
