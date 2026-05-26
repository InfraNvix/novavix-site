import PortalInviteClient from './ui'

export const dynamic = 'force-dynamic'

export default function PublicInvitePortalPage({
  params,
}: {
  params: { token: string }
}) {
  return <PortalInviteClient token={params.token} />
}
