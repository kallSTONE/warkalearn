"use client"

import { useEffect, useMemo, useState } from "react"
import { Award, Plus, Save, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import {
  DEFAULT_CERTIFICATION_SETTINGS,
  CertificationQuestion,
  buildVerificationUrl,
} from "@/lib/certification"

type Course = {
  id: string
  title: string
  slug: string
  lessons: Array<{ id: string; title: string; step_order: number }>
}

type AdminQuestion = CertificationQuestion & {
  explanation: string
  active: boolean
  sort_order: number
}

type SettingsForm = {
  enabled: boolean
  passingScore: string
  timePerQuestion: string
  cooldownHours: string
  questionLimit: string
  verificationBaseUrl: string
  certificateTitle: string
  issuerName: string
  logoPath: string
  templateVariant: string
}

const emptySettingsForm: SettingsForm = {
  enabled: false,
  passingScore: String(DEFAULT_CERTIFICATION_SETTINGS.passing_score),
  timePerQuestion: String(DEFAULT_CERTIFICATION_SETTINGS.time_per_question_minutes),
  cooldownHours: String(DEFAULT_CERTIFICATION_SETTINGS.retry_cooldown_hours),
  questionLimit: "",
  verificationBaseUrl: DEFAULT_CERTIFICATION_SETTINGS.verification_base_url,
  certificateTitle: DEFAULT_CERTIFICATION_SETTINGS.certificate_title,
  issuerName: DEFAULT_CERTIFICATION_SETTINGS.issuer_name,
  logoPath: DEFAULT_CERTIFICATION_SETTINGS.logo_path,
  templateVariant: DEFAULT_CERTIFICATION_SETTINGS.template_variant,
}

export default function AdminCertificationsPage() {
  const { user } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [settings, setSettings] = useState<SettingsForm>(emptySettingsForm)
  const [questions, setQuestions] = useState<AdminQuestion[]>([])

  useEffect(() => {
    if (user !== undefined) setLoading(false)
  }, [user])

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, slug, lessons(id, title, step_order)")
        .order("title", { ascending: true })

      if (error) {
        toast({ title: "Failed to load courses", description: error.message, variant: "destructive" })
        setLoading(false)
        return
      }

      const normalized: Course[] = (data || []).map((course: any) => ({
        id: String(course.id),
        title: course.title,
        slug: course.slug,
        lessons: (course.lessons || [])
          .slice()
          .sort((a: any, b: any) => a.step_order - b.step_order)
          .map((lesson: any) => ({
            id: String(lesson.id),
            title: lesson.title,
            step_order: lesson.step_order,
          })),
      }))

      setCourses(normalized)
      setLoading(false)
    }

    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )

  useEffect(() => {
    const loadCertification = async () => {
      if (!selectedCourseId) {
        setSettings(emptySettingsForm)
        setQuestions([])
        return
      }

      setLoading(true)

      const [{ data: settingsData, error: settingsError }, { data: questionsData, error: questionsError }] =
        await Promise.all([
          supabase
            .from("certification_settings")
            .select("enabled, passing_score, time_per_question_minutes, retry_cooldown_hours, question_limit, verification_base_url, certificate_title, issuer_name, logo_path, template_variant")
            .eq("course_id", Number(selectedCourseId))
            .maybeSingle(),
          supabase
            .from("certification_questions")
            .select("id, question, options, correct_option, explanation, sort_order, active")
            .eq("course_id", Number(selectedCourseId))
            .order("sort_order", { ascending: true }),
        ])

      if (settingsError) {
        toast({ title: "Failed to load certification settings", description: settingsError.message, variant: "destructive" })
      }

      if (questionsError) {
        toast({ title: "Failed to load certification questions", description: questionsError.message, variant: "destructive" })
      }

      setSettings({
        enabled: settingsData?.enabled ?? false,
        passingScore: String(settingsData?.passing_score ?? DEFAULT_CERTIFICATION_SETTINGS.passing_score),
        timePerQuestion: String(settingsData?.time_per_question_minutes ?? DEFAULT_CERTIFICATION_SETTINGS.time_per_question_minutes),
        cooldownHours: String(settingsData?.retry_cooldown_hours ?? DEFAULT_CERTIFICATION_SETTINGS.retry_cooldown_hours),
        questionLimit: settingsData?.question_limit ? String(settingsData.question_limit) : "",
        verificationBaseUrl: settingsData?.verification_base_url ?? DEFAULT_CERTIFICATION_SETTINGS.verification_base_url,
        certificateTitle: settingsData?.certificate_title ?? DEFAULT_CERTIFICATION_SETTINGS.certificate_title,
        issuerName: settingsData?.issuer_name ?? DEFAULT_CERTIFICATION_SETTINGS.issuer_name,
        logoPath: settingsData?.logo_path ?? DEFAULT_CERTIFICATION_SETTINGS.logo_path,
        templateVariant: settingsData?.template_variant ?? DEFAULT_CERTIFICATION_SETTINGS.template_variant,
      })

      setQuestions(
        (questionsData || []).map((question: any, index: number) => ({
          id: String(question.id),
          question: question.question ?? "",
          options: Array.isArray(question.options) ? question.options : [],
          correct_option: question.correct_option ?? 0,
          explanation: question.explanation ?? "",
          sort_order: question.sort_order ?? index + 1,
          active: question.active ?? true,
        }))
      )

      setLoading(false)
    }

    void loadCertification()
  }, [selectedCourseId, toast])

  const updateSettingsField = (field: keyof SettingsForm, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: "",
        options: ["", "", "", ""],
        correct_option: 0,
        explanation: "",
        active: true,
        sort_order: prev.length + 1,
      },
    ])
  }

  const updateQuestion = (idx: number, field: keyof AdminQuestion, value: any) => {
    setQuestions((prev) => prev.map((question, index) => (index === idx ? { ...question, [field]: value } : question)))
  }

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== qIdx) return question
        const nextOptions = [...question.options]
        nextOptions[optIdx] = value
        return { ...question, options: nextOptions }
      })
    )
  }

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((question, index) => (index === qIdx ? { ...question, options: [...question.options, ""] } : question))
    )
  }

  const removeOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((question, index) => {
        if (index !== qIdx) return question
        const nextOptions = question.options.filter((_, optionIndex) => optionIndex !== optIdx)
        return {
          ...question,
          options: nextOptions,
          correct_option: Math.min(question.correct_option, Math.max(0, nextOptions.length - 1)),
        }
      })
    )
  }

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, index) => index !== idx))
  }

  const saveCertification = async () => {
    if (!selectedCourseId) {
      toast({ title: "Select a course", description: "Choose a course before saving", variant: "destructive" })
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question.trim()) {
        toast({ title: `Question ${i + 1} is empty`, variant: "destructive" })
        return
      }
      if (!question.options.length || question.options.some((option) => !option.trim())) {
        toast({ title: `Question ${i + 1} has empty options`, variant: "destructive" })
        return
      }
      if (question.correct_option < 0 || question.correct_option >= question.options.length) {
        toast({ title: `Question ${i + 1} has an invalid correct option`, variant: "destructive" })
        return
      }
    }

    setSaving(true)
    try {
      const settingsPayload = {
        course_id: Number(selectedCourseId),
        enabled: settings.enabled,
        passing_score: Number(settings.passingScore) || DEFAULT_CERTIFICATION_SETTINGS.passing_score,
        time_per_question_minutes: Number(settings.timePerQuestion) || DEFAULT_CERTIFICATION_SETTINGS.time_per_question_minutes,
        retry_cooldown_hours: Number(settings.cooldownHours) || DEFAULT_CERTIFICATION_SETTINGS.retry_cooldown_hours,
        question_limit: settings.questionLimit ? Number(settings.questionLimit) : null,
        verification_base_url: settings.verificationBaseUrl.trim() || DEFAULT_CERTIFICATION_SETTINGS.verification_base_url,
        certificate_title: settings.certificateTitle.trim() || DEFAULT_CERTIFICATION_SETTINGS.certificate_title,
        issuer_name: settings.issuerName.trim() || DEFAULT_CERTIFICATION_SETTINGS.issuer_name,
        logo_path: settings.logoPath.trim() || DEFAULT_CERTIFICATION_SETTINGS.logo_path,
        template_variant: settings.templateVariant.trim() || DEFAULT_CERTIFICATION_SETTINGS.template_variant,
      }

      const { error: upsertError } = await supabase
        .from("certification_settings")
        .upsert(settingsPayload, { onConflict: "course_id" })

      if (upsertError) throw upsertError

      const { error: deleteError } = await supabase
        .from("certification_questions")
        .delete()
        .eq("course_id", Number(selectedCourseId))

      if (deleteError) throw deleteError

      if (questions.length > 0) {
        const questionPayload = questions.map((question, index) => ({
          course_id: Number(selectedCourseId),
          question: question.question.trim(),
          options: question.options,
          correct_option: question.correct_option,
          explanation: question.explanation.trim() || null,
          sort_order: question.sort_order ?? index + 1,
          active: question.active,
        }))

        const { error: insertError } = await supabase.from("certification_questions")
          .insert(questionPayload)
        if (insertError) throw insertError
      }

      toast({ title: "Certification saved", description: "The course certification settings are now live." })
    } catch (error: any) {
      toast({ title: "Failed to save certification", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const verificationPreview = selectedCourseId
    ? buildVerificationUrl(settings.verificationBaseUrl, "preview-code")
    : DEFAULT_CERTIFICATION_SETTINGS.verification_base_url

  if (loading) {
    return <div className="p-6">Loading…</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Award className="h-3.5 w-3.5" />
            Certifications
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatic certificate builder</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lock the exam until the course is 100% complete, then issue a branded PDF certificate on demand.
          </p>
        </div>
      </div>

      <Card className="space-y-4 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Certification settings</CardTitle>
          <CardDescription>Configure access, branding, and exam limits for the selected course.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Passing score</Label>
              <Input
                value={settings.passingScore}
                onChange={(event) => updateSettingsField("passingScore", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Minutes per question</Label>
              <Input
                value={settings.timePerQuestion}
                onChange={(event) => updateSettingsField("timePerQuestion", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Retry cooldown (hours)</Label>
              <Input
                value={settings.cooldownHours}
                onChange={(event) => updateSettingsField("cooldownHours", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSettingsField("enabled", checked)}
              />
              <Label className="m-0">Enable certification</Label>
            </div>
            <div className="flex-1" />
            <Button onClick={saveCertification} disabled={!selectedCourseId || saving}>
              <Save className="mr-2 h-4 w-4" />
              Save certification
            </Button>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Certificate title</Label>
                <Input
                  value={settings.certificateTitle}
                  onChange={(event) => updateSettingsField("certificateTitle", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Issuer name</Label>
                <Input
                  value={settings.issuerName}
                  onChange={(event) => updateSettingsField("issuerName", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo path</Label>
                <Input
                  value={settings.logoPath}
                  onChange={(event) => updateSettingsField("logoPath", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Verification base URL</Label>
                <Input
                  value={settings.verificationBaseUrl}
                  onChange={(event) => updateSettingsField("verificationBaseUrl", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Preview: {verificationPreview}</p>
              </div>

              <div className="space-y-2">
                <Label>Question limit</Label>
                <Input
                  value={settings.questionLimit}
                  onChange={(event) => updateSettingsField("questionLimit", event.target.value)}
                  placeholder="Leave blank to use all active questions"
                />
              </div>

              <div className="space-y-2">
                <Label>Template variant</Label>
                <Input
                  value={settings.templateVariant}
                  onChange={(event) => updateSettingsField("templateVariant", event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">How it works</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Certification stays locked until every lesson in the course is complete.</li>
                <li>
                  The exam timer uses <span className="font-medium text-foreground">2 minutes per question</span> by default.
                </li>
                <li>Failed attempts are available again after the cooldown period.</li>
                <li>Certificates generate as branded PDF files on demand.</li>
              </ul>
              <p>
                {selectedCourse
                  ? `${selectedCourse.lessons.length} lessons are available in this course.`
                  : "Select a course to configure it."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Certification questions</CardTitle>
              <CardDescription>Create a dedicated certification bank for the course.</CardDescription>
            </div>

            <Button onClick={addQuestion} disabled={!selectedCourseId}>
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No certification questions yet. Add the first one to make the exam available.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, idx) => (
                <Collapsible key={question.id ?? idx} defaultOpen={idx === 0} className="rounded-2xl border shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <CollapsibleTrigger className="flex-1 text-left font-medium">
                      Question {idx + 1}: {question.question || "Untitled question"}
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={question.active}
                          onCheckedChange={(checked) => updateQuestion(idx, "active", checked)}
                        />
                        <span>{question.active ? "Active" : "Hidden"}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent className="space-y-4 p-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Question text</Label>
                        <Textarea
                          value={question.question}
                          onChange={(event) => updateQuestion(idx, "question", event.target.value)}
                          placeholder="Type the certification question"
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Explanation</Label>
                        <Textarea
                          value={question.explanation}
                          onChange={(event) => updateQuestion(idx, "explanation", event.target.value)}
                          placeholder="Optional explanation shown after review"
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Options</Label>
                        <Button variant="outline" size="sm" onClick={() => addOption(idx)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add option
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                            <input
                              type="radio"
                              name={`correct-${idx}`}
                              checked={question.correct_option === optionIndex}
                              onChange={() => updateQuestion(idx, "correct_option", optionIndex)}
                              className="h-4 w-4"
                            />
                            <Input
                              value={option}
                              onChange={(event) => updateOption(idx, optionIndex, event.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeOption(idx, optionIndex)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Sort order</Label>
                        <Input
                          type="number"
                          value={String(question.sort_order)}
                          onChange={(event) => updateQuestion(idx, "sort_order", Number(event.target.value) || idx + 1)}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
