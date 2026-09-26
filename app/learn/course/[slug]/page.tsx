import EnrollClient from './enroll/EnrollClient'

export async function generateStaticParams() {
  const localCourses = (await import('@/public/data/courses.json')).default
  return localCourses.map((c: any) => ({ slug: c.slug }))
}

export default function EnrollPage({ params }: { params: { slug: string } }) {
  return <EnrollClient slug={params.slug} />
}
