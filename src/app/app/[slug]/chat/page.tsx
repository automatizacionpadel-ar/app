import { redirect } from 'next/navigation'

export default function LegacyChatRedirect({ params }: { params: { slug: string } }) {
  redirect(`/c/${params.slug}/chat`)
}
