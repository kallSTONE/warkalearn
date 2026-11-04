import { db } from "@/db"
import { siteSettings } from "@/db/schema"
import { eq } from "drizzle-orm"

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
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      hero_title: row.heroTitle,
      hero_subtitle: row.heroSubtitle,
      hero_cta_text: row.heroCtaText,
      hero_cta_link: row.heroCtaLink,
      hero_video_id: row.heroVideoId,
      default_theme: row.defaultTheme,
    }
  } catch (error) {
    console.error("Failed to load site settings:", error)
    return null
  }
}
