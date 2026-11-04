import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/api-auth'
import { getUploadUrl, getPublicUrl } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  const authResult = await authenticateRequest(request)
  if (!authResult.ok) return authResult.response

  try {
    const body = await request.json()
    const filename = String(body?.filename ?? '').trim()
    const contentType = String(body?.contentType ?? 'application/octet-stream').trim()
    const folder = String(body?.folder ?? 'uploads').trim()

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${folder}/${Date.now()}-${cleanFilename}`

    const uploadUrl = await getUploadUrl(key, contentType)
    const publicUrl = getPublicUrl(key)

    return NextResponse.json({ uploadUrl, key, publicUrl }, { status: 200 })
  } catch (error: any) {
    console.error('Upload URL generation error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to generate upload URL' }, { status: 500 })
  }
}

