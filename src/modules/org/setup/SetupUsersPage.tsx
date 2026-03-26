import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { setupApi, type SetupUser } from '@/lib/setupApi'

export default function SetupUsersPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['setup-users'],
    queryFn: () => setupApi.listUsers().then(r => r.data),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    role: 'hr_manager',
    phoneNumber: '',
    password: '',
    language: 'en',
  })

  const addMutation = useMutation({
    mutationFn: () => setupApi.addUser(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup-users'] })
      qc.invalidateQueries({ queryKey: ['setup-progress'] })
      setModalOpen(false)
      setDraft({
        name: '',
        email: '',
        role: 'hr_manager',
        phoneNumber: '',
        password: '',
        language: 'en',
      })
    },
  })

  const roleMutation = useMutation({
    mutationFn: (payload: { id: string; role: string }) =>
      setupApi.updateUserRole(payload.id, payload.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setup-users'] }),
  })

  const users: SetupUser[] = data ?? []

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Invite HR, admin, and manager users</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>Add User</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="table-header text-left">User</th>
              <th className="table-header text-left">Email</th>
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="table-row">
                <td className="table-cell text-gray-900">{user.name}</td>
                <td className="table-cell text-gray-600">{user.email}</td>
                <td className="table-cell">
                  <select
                    className="input text-xs"
                    value={user.role}
                    onChange={e => roleMutation.mutate({ id: user.id, role: e.target.value })}
                  >
                    {['admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer', 'employee'].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
                <td className="table-cell text-gray-600">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No users yet.</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Invite User</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">x</button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="Full name" value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
              <input className="input" placeholder="Email" value={draft.email} onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))} />
              <input className="input" placeholder="Phone number" value={draft.phoneNumber} onChange={e => setDraft(prev => ({ ...prev, phoneNumber: e.target.value }))} />
              <input className="input" type="password" placeholder="Temporary password" value={draft.password} onChange={e => setDraft(prev => ({ ...prev, password: e.target.value }))} />
              <select className="input" value={draft.role} onChange={e => setDraft(prev => ({ ...prev, role: e.target.value }))}>
                {['admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer', 'employee'].map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <input className="input" placeholder="Language (optional)" value={draft.language} onChange={e => setDraft(prev => ({ ...prev, language: e.target.value }))} />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => addMutation.mutate()} disabled={!draft.name.trim() || !draft.email.trim() || !draft.phoneNumber.trim() || !draft.password.trim()}>
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
