import fs from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib"
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ELLIPSIS = "..."
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""

const centerTextX = (
  text: string,
  size: number,
  font: PDFFont,
  pageWidth: number,
  minX = 40,
  maxX?: number
) => {
  const rightBound = maxX ?? pageWidth - minX
  const textWidth = font.widthOfTextAtSize(text, size)
  const centered = (pageWidth - textWidth) / 2
  return Math.max(minX, Math.min(centered, rightBound - textWidth))
}

const fitText = (text: string, size: number, maxWidth: number, font: PDFFont) => {
  if (!text) return ""
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text

  let trimmed = text
  while (trimmed.length > 0 && font.widthOfTextAtSize(`${trimmed}${ELLIPSIS}`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }

  return `${trimmed.trimEnd()}${ELLIPSIS}`
}

const deriveNameFromEmail = (email: string) => {
  const localPart = email.split("@")[0] || ""
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

const toPdfBytes = (value: Buffer) =>
  new Uint8Array(value.buffer, value.byteOffset, value.byteLength)

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = (() => {
      try {
        return getSupabaseAdminClient()
      } catch {
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Supabase configuration is missing.")
        }

        return createClient(supabaseUrl, supabaseAnonKey)
      }
    })()

    const certificateCode = decodeURIComponent(params.code || "").trim()
    if (!certificateCode) {
      return NextResponse.json({ error: "Certificate code is required." }, { status: 400 })
    }

    const { data: certificate, error: certificateError } = await supabase
      .from("certificates")
      .select("id, user_id, course_id, certificate_code, verification_url, status, issued_at, pass_score, attempt_id")
      .eq("certificate_code", certificateCode)
      .maybeSingle()

    if (certificateError || !certificate || certificate.status !== "active") {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 })
    }

    const [{ data: profile }, { data: course }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", certificate.user_id).maybeSingle(),
      supabase.from("courses").select("title, slug").eq("id", certificate.course_id).maybeSingle(),
      supabase
        .from("certification_settings")
        .select("certificate_title, issuer_name, logo_path")
        .eq("course_id", certificate.course_id)
        .maybeSingle(),
    ])

    const userData = "admin" in supabase.auth
      ? await supabase.auth.admin.getUserById(certificate.user_id).then((response) => response.data)
      : null

    const metadata = userData?.user?.user_metadata as Record<string, unknown> | undefined
    const metadataName =
      (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata?.name === "string" && metadata.name.trim()) ||
      ""
    const emailFallback = userData?.user?.email ? deriveNameFromEmail(userData.user.email) : ""

    const studentName = profile?.full_name?.trim() || metadataName || emailFallback || "Verified Learner"
    const courseTitle = course?.title?.trim() || "Course"
    const certificateTitle = settings?.certificate_title?.trim() || "Course Certification"
    const issuerName = settings?.issuer_name?.trim() || "Neway"
    const logoPath = settings?.logo_path || "/assets/images/warkalogo.png"
    const issueDate = new Date(certificate.issued_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([842, 595])
    const { width, height } = page.getSize()

    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica)
    const italicFont = await pdf.embedFont(StandardFonts.HelveticaOblique)

    const logoFilePath = path.join(process.cwd(), "public", logoPath.replace(/^\//, ""))
    const logoBytes = await fs.readFile(logoFilePath).catch(() => null)
    const logoPdfBytes = logoBytes ? toPdfBytes(logoBytes) : null
    const logoImage = logoPdfBytes
      ? logoPath.toLowerCase().endsWith(".jpg") || logoPath.toLowerCase().endsWith(".jpeg")
        ? await pdf.embedJpg(logoPdfBytes).catch(() => null)
        : await pdf.embedPng(logoPdfBytes).catch(() => null)
      : null

    const contentLeft = 70
    const contentRight = width - 70
    const contentWidth = contentRight - contentLeft

    const safeCertificateTitle = fitText(certificateTitle, 22, contentWidth, boldFont)
    const safeStudentName = fitText(studentName, 28, contentWidth, boldFont)
    const safeCourseTitle = fitText(courseTitle, 21, contentWidth, boldFont)
    const safeVerificationUrl = fitText(certificate.verification_url, 10, width - 250, regularFont)

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 0.975) })
    page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: rgb(0.12, 0.14, 0.18), borderWidth: 1.5 })
    page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: rgb(0.75, 0.67, 0.45), borderWidth: 0.8 })
    page.drawLine({ start: { x: 70, y: height - 112 }, end: { x: width - 70, y: height - 112 }, thickness: 1.5, color: rgb(0.82, 0.69, 0.35) })
    page.drawLine({ start: { x: 110, y: 118 }, end: { x: width - 110, y: 118 }, thickness: 1, color: rgb(0.82, 0.69, 0.35) })

    if (logoImage) {
      const logoDims = logoImage.scale(0.18)
      page.drawImage(logoImage, {
        x: 56,
        y: height - 98,
        width: logoDims.width,
        height: logoDims.height,
      })
    }

    page.drawText(issuerName.toUpperCase(), {
      x: width - 170,
      y: height - 72,
      size: 10,
      font: boldFont,
      color: rgb(0.33, 0.35, 0.4),
    })

    page.drawText(safeCertificateTitle, {
      x: centerTextX(safeCertificateTitle, 22, boldFont, width, contentLeft, contentRight),
      y: height - 160,
      size: 22,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })

    page.drawText("This certifies that", {
      x: centerTextX("This certifies that", 13, italicFont, width, contentLeft, contentRight),
      y: height - 210,
      size: 13,
      font: italicFont,
      color: rgb(0.4, 0.42, 0.46),
    })

    page.drawText(safeStudentName, {
      x: centerTextX(safeStudentName, 28, boldFont, width, contentLeft, contentRight),
      y: height - 255,
      size: 28,
      font: boldFont,
      color: rgb(0.08, 0.1, 0.13),
    })

    const completionLine = "has successfully completed and passed the certification exam for"
    page.drawText(completionLine, {
      x: centerTextX(completionLine, 12, regularFont, width, contentLeft, contentRight),
      y: height - 295,
      size: 12,
      font: regularFont,
      color: rgb(0.35, 0.38, 0.42),
    })

    page.drawText(safeCourseTitle, {
      x: centerTextX(safeCourseTitle, 21, boldFont, width, contentLeft, contentRight),
      y: height - 325,
      size: 21,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })

    page.drawText(`Issued on ${issueDate}`, {
      x: 70,
      y: 86,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.38, 0.42),
    })

    page.drawText(`Certificate ID: ${certificate.certificate_code}`, {
      x: width - 280,
      y: 86,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.38, 0.42),
    })

    page.drawText("Verification URL", {
      x: 70,
      y: 60,
      size: 10,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })
    page.drawText(safeVerificationUrl, {
      x: 170,
      y: 60,
      size: 10,
      font: regularFont,
      color: rgb(0.1, 0.35, 0.6),
    })

    // Signature lines
    page.drawLine({
      start: { x: 150, y: 148 },
      end: { x: 320, y: 148 },
      thickness: 0.8,
      color: rgb(0.45, 0.48, 0.52),
    })
    page.drawLine({
      start: { x: width - 320, y: 148 },
      end: { x: width - 150, y: 148 },
      thickness: 0.8,
      color: rgb(0.45, 0.48, 0.52),
    })

    // Faux handwritten signatures
    page.drawText("K. Tadesse", {
      x: 190,
      y: 158,
      size: 17,
      font: italicFont,
      color: rgb(0.08, 0.1, 0.13),
    })
    page.drawText("N. Learn", {
      x: width - 275,
      y: 158,
      size: 17,
      font: italicFont,
      color: rgb(0.08, 0.1, 0.13),
    })

    page.drawText("Kalab Tadesse", {
      x: 186,
      y: 134,
      size: 11,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })
    page.drawText("Founder, Neway Learn", {
      x: 170,
      y: 120,
      size: 10,
      font: regularFont,
      color: rgb(0.35, 0.38, 0.42),
    })

    page.drawText("Kalab Tadesse", {
      x: width - 284,
      y: 134,
      size: 11,
      font: boldFont,
      color: rgb(0.12, 0.14, 0.18),
    })
    page.drawText("Founder, Neway Learn", {
      x: width - 300,
      y: 120,
      size: 10,
      font: regularFont,
      color: rgb(0.35, 0.38, 0.42),
    })

    const pdfBytes = await pdf.save()

    const pdfBody = new ArrayBuffer(pdfBytes.length)
    new Uint8Array(pdfBody).set(pdfBytes)

    return new NextResponse(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate-${certificate.certificate_code}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unable to generate certificate." }, { status: 500 })
  }
}
