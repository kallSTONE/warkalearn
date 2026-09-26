import { unstable_noStore as noStore } from "next/cache"

import { supabase } from "@/lib/supabase"

export type SiteSettings = {
    id: number
    hero_title: string | null
    hero_subtitle: string | null
    hero_cta_text: string | null
    hero_cta_link: string | null
    hero_video_id: string | null
    default_theme: string | null
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
    noStore()

    const { data, error } = await supabase
        .from("site_settings")
        .select(
            "id, hero_title, hero_subtitle, hero_cta_text, hero_cta_link, hero_video_id, default_theme"
        )
        .eq("id", 1)
        .maybeSingle()

    if (error) {
        console.error("Failed to load site settings:", error)
        return null
    }

    return data ?? null
}
