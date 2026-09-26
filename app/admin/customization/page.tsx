"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { useSupabase } from "@/components/providers/supabase-provider"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "darkred", label: "Dark Red" },
    { value: "corporate", label: "Corporate" },
    { value: "sunrise", label: "Sunrise" },
    { value: "ocean", label: "Ocean" },
]

type SiteSettingsForm = {
    heroTitle: string
    heroSubtitle: string
    heroCtaText: string
    heroCtaLink: string
    heroVideoId: string
    defaultTheme: string
}

const emptyForm: SiteSettingsForm = {
    heroTitle: "",
    heroSubtitle: "",
    heroCtaText: "",
    heroCtaLink: "",
    heroVideoId: "",
    defaultTheme: "dark",
}

const normalizeYouTubeId = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ""

    const idMatch = trimmed.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
    if (idMatch?.[1]) return idMatch[1]

    if (trimmed.length === 11) return trimmed

    return trimmed
}

export default function AdminCustomizationPage() {
    const { supabase } = useSupabase()
    const { toast } = useToast()
    const { setTheme } = useTheme()
    const [form, setForm] = useState<SiteSettingsForm>(emptyForm)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let active = true

        const loadSettings = async () => {
            const { data, error } = await supabase
                .from("site_settings")
                .select(
                    "hero_title, hero_subtitle, hero_cta_text, hero_cta_link, hero_video_id, default_theme"
                )
                .eq("id", 1)
                .maybeSingle()

            if (!active) return

            if (error) {
                toast({
                    title: "Failed to load settings",
                    description: error.message ?? "Please try again.",
                    variant: "destructive",
                })
                setLoading(false)
                return
            }

            if (data) {
                setForm({
                    heroTitle: data.hero_title ?? "",
                    heroSubtitle: data.hero_subtitle ?? "",
                    heroCtaText: data.hero_cta_text ?? "",
                    heroCtaLink: data.hero_cta_link ?? "",
                    heroVideoId: data.hero_video_id ?? "",
                    defaultTheme: data.default_theme ?? "dark",
                })
            }

            setLoading(false)
        }

        loadSettings()

        return () => {
            active = false
        }
    }, [supabase, toast])

    const updateField = (field: keyof SiteSettingsForm, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSave = async () => {
        setSaving(true)

        const payload = {
            id: 1,
            hero_title: form.heroTitle || null,
            hero_subtitle: form.heroSubtitle || null,
            hero_cta_text: form.heroCtaText || null,
            hero_cta_link: form.heroCtaLink || null,
            hero_video_id: normalizeYouTubeId(form.heroVideoId) || null,
            default_theme: form.defaultTheme || null,
        }

        const { error } = await supabase.from("site_settings").upsert(payload, {
            onConflict: "id",
        })

        if (error) {
            toast({
                title: "Save failed",
                description: error.message ?? "Please try again.",
                variant: "destructive",
            })
            setSaving(false)
            return
        }

        setTheme(form.defaultTheme)
        toast({
            title: "Settings saved",
            description: "Your site updates are now live.",
        })
        setSaving(false)
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-xl md:text-2xl font-semibold">Site customization</h1>
                <p className="text-sm text-muted-foreground">
                    Update the hero section and choose the default site theme.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Hero section</CardTitle>
                    <CardDescription>
                        Control the main headline, supporting text, CTA, and hero video.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="hero-title">Hero title</Label>
                        <Textarea
                            id="hero-title"
                            value={form.heroTitle}
                            onChange={(event) => updateField("heroTitle", event.target.value)}
                            placeholder="Add your headline"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hero-subtitle">Hero subtitle</Label>
                        <Textarea
                            id="hero-subtitle"
                            value={form.heroSubtitle}
                            onChange={(event) => updateField("heroSubtitle", event.target.value)}
                            placeholder="Add supporting text"
                            rows={2}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="hero-cta">CTA text</Label>
                            <Input
                                id="hero-cta"
                                value={form.heroCtaText}
                                onChange={(event) => updateField("heroCtaText", event.target.value)}
                                placeholder="Explore programs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hero-cta-link">CTA link</Label>
                            <Input
                                id="hero-cta-link"
                                value={form.heroCtaLink}
                                onChange={(event) => updateField("heroCtaLink", event.target.value)}
                                placeholder="/learn"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hero-video">Hero video (YouTube ID or URL)</Label>
                        <Input
                            id="hero-video"
                            value={form.heroVideoId}
                            onChange={(event) => updateField("heroVideoId", event.target.value)}
                            placeholder="mSs5scC7hsI"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Default theme</CardTitle>
                    <CardDescription>
                        Pick the theme visitors see when they land on the site.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Label htmlFor="default-theme">Theme</Label>
                    <select
                        id="default-theme"
                        value={form.defaultTheme}
                        onChange={(event) => {
                            const value = event.target.value
                            updateField("defaultTheme", value)
                            setTheme(value)
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {themeOptions.map((theme) => (
                            <option key={theme.value} value={theme.value}>
                                {theme.label}
                            </option>
                        ))}
                    </select>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button className="w-full sm:w-auto" onClick={handleSave} disabled={loading || saving}>
                        {saving ? "Saving..." : "Save settings"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
