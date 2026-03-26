import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarApi } from '@/lib/api'

type CalendarConnection = {
  provider: string
  account_email?: string
  connected?: boolean
  expires_at?: string
}

export default function CalendarIntegrationsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: () => calendarApi.listConnections().then(r => r.data),
  })

  const connectMutation = useMutation({
    mutationFn: (provider: string) => calendarApi.authorize(provider, `${window.location.origin}/settings/calendar-integrations`),
    onSuccess: (res) => {
      const url = res.data?.authorization_url
      if (url) window.location.href = url
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => calendarApi.disconnect(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-connections'] }),
  })

  const connections: CalendarConnection[] = data?.data ?? []
  const getConnection = (provider: string) => connections.find(c => c.provider === provider)

  const providers = [
    { key: 'google', label: 'Google Calendar', description: 'Sync interviews with Google Calendar' },
    { key: 'microsoft', label: 'Microsoft Outlook', description: 'Sync interviews with Microsoft Outlook' },
  ]

  return (
    <div className="animate-in">
      <h1 className="page-title">Calendar Integrations</h1>
      <p className="page-subtitle">Connect recruiter calendars for interview scheduling.</p>

      {isLoading && <div className="text-sm text-gray-400 mt-6">Loading connections...</div>}

      <div className="mt-6 grid grid-cols-2 gap-4">
        {providers.map(provider => {
          const conn = getConnection(provider.key)
          const connected = conn?.connected
          return (
            <div key={provider.key} className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900">{provider.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
              <div className="mt-3 text-xs text-gray-500">
                Status: {connected ? (
                  <span className="text-emerald-600 font-medium">Connected{conn?.account_email ? ` (${conn.account_email})` : ''}</span>
                ) : (
                  <span className="text-gray-400">Not connected</span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                {!connected ? (
                  <button
                    className="btn-primary text-xs"
                    onClick={() => connectMutation.mutate(provider.key)}
                    disabled={connectMutation.isPending}
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => disconnectMutation.mutate(provider.key)}
                    disabled={disconnectMutation.isPending}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
