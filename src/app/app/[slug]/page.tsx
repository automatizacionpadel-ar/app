import { redirect } from 'next/navigation'

export default function AppPage({ params }: { params: { slug: string } }) {
  redirect(`/app/${params.slug}/chat`)
}
