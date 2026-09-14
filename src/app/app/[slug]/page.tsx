import { redirect } from 'next/navigation'

export default function AppPage({ params }: { params: { slug: string } }) {
  redirect(`/c/${params.slug}`)
}
