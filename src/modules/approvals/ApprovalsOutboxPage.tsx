import ApprovalsListPage from './ApprovalsListPage'

export default function ApprovalsOutboxPage() {
  return (
    <ApprovalsListPage
      scope="outbox"
      title="My Sent Approvals"
      subtitle="Track approvals you have submitted across modules."
    />
  )
}
