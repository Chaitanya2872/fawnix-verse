import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Save, Send, Plus, X } from 'lucide-react'
import { approvalFlowsApi, departmentsApi, recruitmentApi } from '@/lib/api'

export default function NewHiringRequestPage() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState<string[]>(['React', 'TypeScript'])
  const [newSkill, setNewSkill] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    job_title: '',
    department_id: '',
    approval_flow_id: '',
    hiring_manager_id: '',
    headcount: 1,
    priority: 'medium',
    salary_min: '',
    salary_max: '',
    experience_years: '',
    expected_date: '',
    description: '',
    qualifications: '',
    notes: '',
  })

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then(r => r.data),
  })

  const { data: flowData } = useQuery({
    queryKey: ['approval-flows'],
    queryFn: () => approvalFlowsApi.list().then(r => r.data),
  })

  const departments = deptData?.data ?? []
  const flows = flowData?.data ?? []

  const addSkill = () => {
    const value = newSkill.trim()
    if (value && !skills.includes(value)) {
      setSkills([...skills, value])
      setNewSkill('')
    }
  }

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (status: 'draft' | 'pending') => {
    setSubmitting(true)
    try {
      await recruitmentApi.createHiringRequest({
        job_title: form.job_title,
        department_id: form.department_id || undefined,
        approval_flow_id: form.approval_flow_id,
        hiring_manager_id: form.hiring_manager_id || undefined,
        description: form.description || undefined,
        skills,
        qualifications: form.qualifications || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        headcount: Number(form.headcount) || 1,
        priority: form.priority,
        expected_date: form.expected_date || undefined,
        notes: form.notes || undefined,
        status,
      })
      navigate('/recruitment/hiring-requests')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl animate-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">New Hiring Request</h1>
          <p className="page-subtitle">Submit a request to hire for a new role</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Job Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Job Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Senior Frontend Developer"
                value={form.job_title}
                onChange={e => handleChange('job_title', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Department *</label>
              <select
                className="input"
                value={form.department_id}
                onChange={e => handleChange('department_id', e.target.value)}
              >
                <option value="">Select department</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Approval Flow *</label>
              <select
                className="input"
                value={form.approval_flow_id}
                onChange={e => handleChange('approval_flow_id', e.target.value)}
              >
                <option value="">Select approval flow</option>
                {flows.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Hiring Manager</label>
              <input
                type="text"
                className="input"
                placeholder="Optional"
                value={form.hiring_manager_id}
                onChange={e => handleChange('hiring_manager_id', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Headcount *</label>
              <input
                type="number"
                className="input"
                value={form.headcount}
                onChange={e => handleChange('headcount', e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Min Salary (?)</label>
              <input
                type="number"
                className="input"
                placeholder="800000"
                value={form.salary_min}
                onChange={e => handleChange('salary_min', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Salary (?)</label>
              <input
                type="number"
                className="input"
                placeholder="1500000"
                value={form.salary_max}
                onChange={e => handleChange('salary_max', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Experience (years)</label>
              <input
                type="number"
                className="input"
                placeholder="3"
                min={0}
                value={form.experience_years}
                onChange={e => handleChange('experience_years', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Expected Start Date</label>
              <input
                type="date"
                className="input"
                value={form.expected_date}
                onChange={e => handleChange('expected_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Job Description</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Description *</label>
              <textarea
                className="input min-h-[120px] resize-none"
                placeholder="Describe the role, responsibilities, and what the team does..."
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Qualifications</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Required education, certifications, and background..."
                value={form.qualifications}
                onChange={e => handleChange('qualifications', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-lg">
                {skill}
                <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="text-brand-400 hover:text-brand-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Add a skill..."
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
            />
            <button onClick={addSkill} className="btn-secondary px-3">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Additional Notes</h2>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="Any additional context for the approver..."
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button
            className="btn-secondary"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            className="btn-primary"
            disabled={submitting}
            onClick={() => handleSubmit('pending')}
          >
            <Send className="w-4 h-4" />
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  )
}
