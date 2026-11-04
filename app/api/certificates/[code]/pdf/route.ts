import fs from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib"
import { db } from "@/db"
import { certificates, profiles, courses, certificationSettings, users } from "@/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ELLIPSIS = "..."

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
    const certificateCode = decodeURIComponent(params.code || "").trim()
    if (!certificateCode) {
      return NextResponse.json({ error: "Certificate code is required." }, { status: 400 })
    }

    const certificate = await db.query.certificates.findFirst({
      where: eq(certificates.certificateCode, certificateCode),
    })

    if (!certificate || certificate.status !== "active") {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 })
    }

    const [profile, course, settings, user] = await Promise.all([
      db.query.profiles.findFirst({
        where: eq(profiles.id, certificate.userId),
        columns: { fullName: true },
      }),
      db.query.courses.findFirst({
        where: eq(courses.id, certificate.courseId),
        columns: { title: true, slug: true },
      }),
      db.query.certificationSettings.findFirst({
        where: eq(certificationSettings.courseId, certificate.courseId),
        columns: { certificateTitle: true, issuerName: true, logoPath: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, certificate.userId),
        columns: { name: true, email: true },
      }),
    ])

    const emailFallback = user?.email ? deriveNameFromEmail(user.email) : ""
    const studentName =
      profile?.fullName?.trim() ||
      user?.name?.trim() ||
      emailFallback ||
      "Verified Learner"

    const courseTitle = course?.title?.trim() || "Course"
    const certificateTitle = settings?.certificateTitle?.trim() || "Course Certification"
    const issuerName = settings?.issuerName?.trim() || "Neway"
    const logoPath = settings?.logoPath || "/assets/images/warkalogo.png"
    const issueDate = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
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
    const safeVerificationUrl = fitText(certificate.verificationUrl, 10, width - 250, regularFont)

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
      y: height - 68,
      size: 9.5,
      font: boldFont,
      color: rgb(0.35, 0.39, 0.46),
    })

    const titleX = centerTextX(safeCertificateTitle, 22, boldFont, width, contentLeft, contentRight)
    page.drawText(safeCertificateTitle, {
      x: titleX,
      y: height - 146,
      size: 22,
      font: boldFont,
      color: rgb(0.1, 0.13, 0.18),
    })

    const subtitleText = "THIS IS PROUDLY PRESENTED TO"
    const subtitleX = centerTextX(subtitleText, 10, regularFont, width, contentLeft, contentRight)
    page.drawText(subtitleText, {
      x: subtitleX,
      y: height - 188,
      size: 10,
      font: regularFont,
      color: rgb(0.42, 0.46, 0.54),
    })

    const studentX = centerTextX(safeStudentName, 28, boldFont, width, contentLeft, contentRight)
    page.drawText(safeStudentName, {
      x: studentX,
      y: height - 232,
      size: 28,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.22),
    })

    const completionLine = "for successfully completing the course requirements of"
    const completionX = centerTextX(completionLine, 11, regularFont, width, contentLeft, contentRight)
    page.drawText(completionLine, {
      x: completionX,
      y: height - 270,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.39, 0.46),
    })

    const courseX = centerTextX(safeCourseTitle, 21, boldFont, width, contentLeft, contentRight)
    page.drawText(safeCourseTitle, {
      x: courseX,
      y: height - 306,
      size: 21,
      font: boldFont,
      color: rgb(0.15, 0.23, 0.38),
    })

    const note = `This official credential acknowledges successful evaluation with a passing standard of ${certificate.passScore}%.`
    const safeNote = fitText(note, 10, width - 180, italicFont)
    const noteX = centerTextX(safeNote, 10, italicFont, width, contentLeft, contentRight)
    page.drawText(safeNote, {
      x: noteX,
      y: height - 340,
      size: 10,
      font: italicFont,
      color: rgb(0.45, 0.49, 0.57),
    })

    // Footer info
    page.drawText("CERTIFICATE ID", {
      x: 74,
      y: 92,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.49, 0.57),
    })
    page.drawText(certificate.certificateCode, {
      x: 74,
      y: 78,
      size: 11,
      font: boldFont,
      color: rgb(0.15, 0.23, 0.38),
    })

    page.drawText("ISSUED ON", {
      x: 270,
      y: 92,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.49, 0.57),
    })
    page.drawText(issueDate, {
      x: 270,
      y: 78,
      size: 10.5,
      font: regularFont,
      color: rgb(0.15, 0.23, 0.38),
    })

    page.drawText("AUTHORIZED ISSUER", {
      x: width - 215,
      y: 92,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.49, 0.57),
    })
    page.drawText(issuerName, {
      x: width - 215,
      y: 78,
      size: 10.5,
      font: boldFont,
      color: rgb(0.15, 0.23, 0.38),
    })

    page.drawText(`Verify at: ${safeVerificationUrl}`, {
      x: 74,
      y: 46,
      size: 8.5,
      font: regularFont,
      color: rgb(0.45, 0.49, 0.57),
    })

    const pdfBytes = await pdf.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificate-${certificate.certificateCode}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err: any) {
    console.error("Certificate PDF generation error:", err)
    return NextResponse.json({ error: "Failed to generate certificate PDF." }, { status: 500 })
  }
}
