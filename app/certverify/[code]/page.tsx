"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { BadgeCheck, Download, ShieldCheck, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type CertificateRecord = {
  id: string 
  user_id: string
  course_id: number
  certificate_code: string
  verification_url: string
  status: string
  issued_at: string
  pdf_url: string | null
} 
 
export default function CertificateVerificationPage() {
  const params = useParams() as { code: string }
  const code = params.code

  const [loading, setLoading] = useState(true)
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null)
  const [studentName, setStudentName] = useState("Verified Learner")
  const [courseTitle, setCourseTitle] = useState("Course")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!code) return

      setLoading(true)
      setError(null)
 
      const { data: certData, error: certError } = await supabase
        .from("certificates")
        .select("id, user_id, course_id, certificate_code, verification_url, status, issued_at, pdf_url")
        .eq("certificate_code", decodeURIComponent(code))
        .maybeSingle()

      if (certError || !certData) {
        setError("Certificate not found.")
        setLoading(false)
        return
      }

      const [{ data: profileData }, { data: courseData }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", certData.user_id).maybeSingle(),
        supabase.from("courses").select("title").eq("id", certData.course_id).maybeSingle(),
      ])

      setCertificate(certData as CertificateRecord)
      setStudentName(profileData?.full_name?.trim() || "Verified Learner")
      setCourseTitle(courseData?.title?.trim() || "Course")
      setLoading(false)
    }

    load()
  }, [code])

  if (loading) {
    return <div className="p-6 text-center">Loading verification…</div>
  }

  if (error || !certificate) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Invalid certificate</CardTitle>
            <CardDescription>{error || "This certificate could not be verified."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-background via-background to-emerald-500/5">
        <CardHeader className="space-y-3 border-b bg-background/70">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Verified certificate
            </Badge>
            <Badge variant="outline" className="gap-1 text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Active
            </Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl">Certificate verification</CardTitle>
          <CardDescription>
            The certificate code is valid and issued by the platform.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Student name</p>
              <p className="mt-1 text-lg font-semibold">{studentName}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Course</p>
              <p className="mt-1 text-lg font-semibold">{courseTitle}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Certificate code</p>
              <p className="mt-1 text-sm font-medium break-all">{certificate.certificate_code}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued on</p>
              <p className="mt-1 text-lg font-semibold">{issuedDate}</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/api/certificates/${encodeURIComponent(certificate.certificate_code)}/pdf`} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={certificate.verification_url} target="_blank" rel="noreferrer">
                Open verification link
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
