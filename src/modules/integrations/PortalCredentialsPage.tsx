import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalCredentialsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const PLATFORMS = ['linkedin', 'naukri', 'indeed'] as const
type Platform = typeof PLATFORMS[number]

type CredentialForm = {
  client_id: string
  client_secret: string
  access_token: string
  refresh_token: string
  expires_at: string
  account_name: string
  is_active: boolean
}

const emptyForm = (): CredentialForm => ({
  client_id: '',
  client_secret: '',
  access_token: '',
  refresh_token: '',
  expires_at: '',
  account_name: '',
  is_active: true,
})

export default function PortalCredentialsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['portal-credentials'],
    queryFn: () => portalCredentialsApi.list().then(r => r.data),
  })

  const [forms, setForms] = useState<Record<Platform, CredentialForm>>({
    linkedin: emptyForm(),
    naukri: emptyForm(),
    indeed: emptyForm(),
  })

  useEffect(() => {
    const rows = data?.data ?? []
    const next: Record<Platform, CredentialForm> = {
      linkedin: emptyForm(),
      naukri: emptyForm(),
      indeed: emptyForm(),
    }
    for (const row of rows) {
      const platform = row.platform as Platform
      if (!next[platform]) continue
      next[platform] = {
        ...next[platform],
        client_id: row.client_id || '',
        account_name: row.account_name || '',
        is_active: row.is_active ?? true,
      }
    }
    setForms(next)
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: any) => portalCredentialsApi.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-credentials'] }),
  })

  const handleChange = (platform: Platform, key: keyof CredentialForm, value: string | boolean) => {
    setForms(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }))
  }

  const handleSave = (platform: Platform) => {
    const form = forms[platform]
    const payload: any = {
      platform,
      is_active: form.is_active,
      client_id: form.client_id || undefined,
      account_name: form.account_name || undefined,
    }
    if (form.client_secret) payload.client_secret = form.client_secret
    if (form.access_token) payload.access_token = form.access_token
    if (form.refresh_token) payload.refresh_token = form.refresh_token
    if (form.expires_at) payload.expires_at = form.expires_at
    mutation.mutate(payload)
  }

  const isBusy = mutation.isPending

  return (
    <div className="max-w-4xl animate-in space-y-6">
      <div>
        <h1 className="page-title">Portal Credentials</h1>
        <p className="page-subtitle">Manage API credentials for job boards</p>
      </div>

      {PLATFORMS.map((platform) => (
        <div key={platform} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 capitalize">{platform}</h2>
            <label className="text-xs text-gray-500 flex items-center gap-2">
              <input
                type="checkbox"
                checked={forms[platform].is_active}
                onChange={e => handleChange(platform, 'is_active', e.target.checked)}
              />
              Active
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client ID</label>
              <input
                className="input"
                value={forms[platform].client_id}
                onChange={e => handleChange(platform, 'client_id', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Account Name</label>
              <input
                className="input"
                value={forms[platform].account_name}
                onChange={e => handleChange(platform, 'account_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Secret</label>
              <input
                className="input"
                placeholder="Leave blank to keep existing"
                value={forms[platform].client_secret}
                onChange={e => handleChange(platform, 'client_secret', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Access Token</label>
              <input
                className="input"
                placeholder="Leave blank to keep existing"
                value={forms[platform].access_token}
                onChange={e => handleChange(platform, 'access_token', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Refresh Token</label>
              <input
                className="input"
                placeholder="Leave blank to keep existing"
                value={forms[platform].refresh_token}
                onChange={e => handleChange(platform, 'refresh_token', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Expires At (ISO)</label>
              <input
                className="input"
                placeholder="2026-12-31T23:59:59Z"
                value={forms[platform].expires_at}
                onChange={e => handleChange(platform, 'expires_at', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              className={cn('btn-primary', isBusy && 'opacity-70')}
              onClick={() => handleSave(platform)}
              disabled={isBusy}
            >
              Save
            </button>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="text-sm text-gray-400">Loading credentials...</div>
      )}
    </div>
  )
}
