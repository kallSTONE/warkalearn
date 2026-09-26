"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/providers/supabase-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { CalendarDays, CheckCircle2, Edit3, Loader2, Plus, RefreshCw, Save, Trash2, Users, Clock } from "lucide-react"

type LiveClass = {
  id: string
  slug: string
  title: string
  description: string | null
  instructor_name: string
  instructor_bio: string | null
  instructor_avatar_url: string | null
  cover_image_url: string | null
  meeting_platform: string
  meeting_url: string | null
  start_at: string
  end_at: string | null
  timezone: string
  price: number
  currency: string
  seats_total: number | null
  status: string
  registration_status: string
  registration_count?: number
}

type LiveClassRegistration = {
  id: string
  live_class_id: string
  user_id: string
  amount_paid: number
  payment_status: string
  payment_method: string
  payment_reference: string | null
  registration_status: string
  notes: string | null
  created_at: string
  live_classes: {
    id: string
    title: string
    slug: string
    start_at: string
    meeting_platform: string
    meeting_url: string | null
    currency: string
  } | null
  profiles: {
    id: string
    full_name: string | null
    role: string | null
  } | null
}

type FormState = {
  slug: string
  title: string
  description: string
  instructor_name: string
  instructor_bio: string
  instructor_avatar_url: string
  cover_image_url: string
  meeting_platform: string
  meeting_url: string
  start_at: string
  end_at: string
  timezone: string
  price: string
  currency: string
  seats_total: string
  status: string
  registration_status: string
}

const emptyForm: FormState = {
  slug: "",
  title: "",
  description: "",
  instructor_name: "",
  instructor_bio: "",
  instructor_avatar_url: "",
  cover_image_url: "",
  meeting_platform: "Zoom",
  meeting_url: "",
  start_at: "",
  end_at: "",
  timezone: "Africa/Addis_Ababa",
  price: "0",
  currency: "ETB",
  seats_total: "",
  status: "draft",
  registration_status: "open",
}

const toFormState = (row: LiveClass): FormState => ({
  slug: row.slug ?? "",
  title: row.title ?? "",
  description: row.description ?? "",
  instructor_name: row.instructor_name ?? "",
  instructor_bio: row.instructor_bio ?? "",
  instructor_avatar_url: row.instructor_avatar_url ?? "",
  cover_image_url: row.cover_image_url ?? "",
  meeting_platform: row.meeting_platform ?? "Zoom",
  meeting_url: row.meeting_url ?? "",
  start_at: row.start_at ? row.start_at.slice(0, 16) : "",
  end_at: row.end_at ? row.end_at.slice(0, 16) : "",
  timezone: row.timezone ?? "Africa/Addis_Ababa",
  price: String(row.price ?? 0),
  currency: row.currency ?? "ETB",
  seats_total: row.seats_total ? String(row.seats_total) : "",
  status: row.status ?? "draft",
  registration_status: row.registration_status ?? "open",
})

export default function AdminLiveClassesPage() {
  const router = useRouter()
  const { user, supabase } = useSupabase()
  const { toast } = useToast()

  const [classes, setClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [enrollmentClassId, setEnrollmentClassId] = useState<string>("")
  const [enrolments, setEnrolments] = useState<LiveClassRegistration[]>([])
  const [enrolmentsLoading, setEnrolmentsLoading] = useState(false)
  const sortedClasses = useMemo(() => [...classes].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()), [classes])

  const loadClasses = async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error("Missing session token.")
      }

      const response = await fetch("/api/admin/live-classes", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "Unable to load live classes."))
      }

      setClasses((payload?.data ?? []) as LiveClass[])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? "Unable to load live classes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user !== undefined) {
      loadClasses()
    }
  }, [user])

  useEffect(() => {
    if (!enrollmentClassId && classes.length > 0) {
      setEnrollmentClassId(classes[0].id)
    }
  }, [classes, enrollmentClassId])

  useEffect(() => {
    const loadEnrolments = async () => {
      if (!enrollmentClassId) {
        setEnrolments([])
        return
      }

      setEnrolmentsLoading(true)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        if (!accessToken) {
          throw new Error("Missing session token.")
        }

        const response = await fetch(`/api/admin/live-classes/${enrollmentClassId}/registrations`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(String(payload?.error ?? "Unable to load live class enrolments."))
        }

        setEnrolments((payload?.data ?? []) as LiveClassRegistration[])
      } catch (error: any) {
        toast({
          title: "Enrolments error",
          description: error?.message ?? "Unable to load live class enrolments.",
          variant: "destructive",
        })
        setEnrolments([])
      } finally {
        setEnrolmentsLoading(false)
      }
    }

    if (user !== undefined) {
      void loadEnrolments()
    }
  }, [enrollmentClassId, supabase, toast, user])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (row: LiveClass) => {
    setEditingId(row.id)
    setForm(toFormState(row))
    setDialogOpen(true)
  }

  const saveClass = async () => {
    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error("Missing session token.")
      }

      const payload = {
        ...form,
        price: Number(form.price || 0),
        seats_total: form.seats_total ? Number(form.seats_total) : null,
      }

      const response = await fetch(
        editingId ? `/api/admin/live-classes/${editingId}` : "/api/admin/live-classes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const payloadResponse = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(String(payloadResponse?.error ?? "Unable to save live class."))
      }

      toast({
        title: "Saved",
        description: editingId ? "Live class updated successfully." : "Live class created successfully.",
      })

      setDialogOpen(false)
      await loadClasses()
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message ?? "Unable to save live class.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateClass = async (id: string, patch: Partial<FormState>) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error("Missing session token.")

      const response = await fetch(`/api/admin/live-classes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...patch,
          price: patch.price !== undefined ? Number(patch.price) : undefined,
          seats_total: patch.seats_total !== undefined ? (patch.seats_total ? Number(patch.seats_total) : null) : undefined,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(payload?.error ?? "Unable to update live class."))
      await loadClasses()
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message ?? "Unable to update live class.",
        variant: "destructive",
      })
    }
  }

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this live class?")) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error("Missing session token.")

      const response = await fetch(`/api/admin/live-classes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(payload?.error ?? "Unable to delete live class."))

      toast({ title: "Deleted", description: "Live class removed." })
      await loadClasses()
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message ?? "Unable to delete live class.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Live Classes</h1>
          <p className="text-muted-foreground">Create, edit, publish, and close class registrations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadClasses} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New class
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{sortedClasses.length}</p>
            <p className="text-sm text-muted-foreground">Total live classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{sortedClasses.filter((item) => item.status === 'published').length}</p>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Edit3 className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-bold">{sortedClasses.filter((item) => item.registration_status === 'open').length}</p>
            <p className="text-sm text-muted-foreground">Registrations open</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class list</CardTitle>
          <CardDescription>Manage upcoming live sessions and payment access.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading live classes...
            </div>
          ) : sortedClasses.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
              No live classes yet. Create your first session.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sortedClasses.map((item) => {
                const startDate = new Date(item.start_at)
                return (
                  <div key={item.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <img
                        src={item.cover_image_url || '/assets/images/courses-Thumbnail/DefaultThumbnail.png'}
                        alt={item.title}
                        className="h-36 w-full rounded-xl object-cover lg:w-40"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.status === 'published' ? 'default' : 'secondary'}>{item.status}</Badge>
                          <Badge variant={item.registration_status === 'open' ? 'outline' : 'secondary'}>{item.registration_status}</Badge>
                          <Badge variant="outline">{item.registration_count ?? 0} registrations</Badge>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.instructor_name} • {item.meeting_platform}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {startDate.toLocaleString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openEdit(item)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => updateClass(item.id, { registration_status: item.registration_status === 'open' ? 'closed' : 'open' })}
                          >
                            {item.registration_status === 'open' ? 'Close registrations' : 'Open registrations'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => updateClass(item.id, { status: item.status === 'published' ? 'draft' : 'published' })}
                          >
                            {item.status === 'published' ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button variant="destructive" onClick={() => deleteClass(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Enrolments</CardTitle>
              <CardDescription>Review students registered for a live class.</CardDescription>
            </div>
            <div className="w-full md:w-80">
              <Select value={enrollmentClassId} onValueChange={setEnrollmentClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select live class" />
                </SelectTrigger>
                <SelectContent>
                  {sortedClasses.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!enrollmentClassId ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              Create a live class to view its enrolments.
            </div>
          ) : enrolmentsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading enrolments...
            </div>
          ) : enrolments.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              No enrolments for this live class yet.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {enrolments.map((enrolment) => {
                const registeredAt = new Date(enrolment.created_at)
                const liveClass = enrolment.live_classes
                const studentName = enrolment.profiles?.full_name?.trim() || enrolment.user_id

                return (
                  <div key={enrolment.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{studentName}</h3>
                        <p className="text-sm text-muted-foreground">{enrolment.profiles?.role ?? 'student'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Badge variant={enrolment.payment_status === 'paid' ? 'default' : 'secondary'}>{enrolment.payment_status}</Badge>
                        <Badge variant={enrolment.registration_status === 'registered' ? 'outline' : 'secondary'}>{enrolment.registration_status}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{liveClass?.title ?? 'Live class'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {registeredAt.toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold">{liveClass?.currency ?? 'ETB'} {Number(enrolment.amount_paid || 0).toLocaleString()}</span>
                    </div>

                    {liveClass?.meeting_url ? (
                      <Button className="w-full" variant="outline" asChild>
                        <a href={liveClass.meeting_url} target="_blank" rel="noreferrer">
                          Open meeting link
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit live class' : 'Create live class'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Instructor name</Label>
              <Input value={form.instructor_name} onChange={(e) => setForm((prev) => ({ ...prev, instructor_name: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Start time</Label>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Seats total</Label>
              <Input type="number" min="1" value={form.seats_total} onChange={(e) => setForm((prev) => ({ ...prev, seats_total: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registration status</Label>
              <Select value={form.registration_status} onValueChange={(value) => setForm((prev) => ({ ...prev, registration_status: value }))}>
                <SelectTrigger><SelectValue placeholder="Select registration status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">open</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Meeting URL</Label>
              <Input value={form.meeting_url} onChange={(e) => setForm((prev) => ({ ...prev, meeting_url: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Cover image URL</Label>
              <Input value={form.cover_image_url} onChange={(e) => setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instructor bio</Label>
              <Textarea value={form.instructor_bio} onChange={(e) => setForm((prev) => ({ ...prev, instructor_bio: e.target.value }))} rows={3} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveClass} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
