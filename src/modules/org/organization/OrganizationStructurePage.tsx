import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orgApi, type Department, type BusinessUnit, type Team, type Location, type Designation } from '@/lib/orgApi'

export default function OrganizationStructurePage() {
  const qc = useQueryClient()
  const [depName, setDepName] = useState('')
  const [depHead, setDepHead] = useState('')
  const [buName, setBuName] = useState('')
  const [buOwner, setBuOwner] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamDept, setTeamDept] = useState('')
  const [locationName, setLocationName] = useState('')
  const [designationName, setDesignationName] = useState('')

  const { data: depData } = useQuery({
    queryKey: ['org-departments'],
    queryFn: () => orgApi.listDepartments().then(r => r.data),
  })
  const { data: buData } = useQuery({
    queryKey: ['org-business-units'],
    queryFn: () => orgApi.listBusinessUnits().then(r => r.data),
  })
  const { data: teamData } = useQuery({
    queryKey: ['org-teams'],
    queryFn: () => orgApi.listTeams().then(r => r.data),
  })
  const { data: locationData } = useQuery({
    queryKey: ['org-locations'],
    queryFn: () => orgApi.listLocations().then(r => r.data),
  })
  const { data: designationData } = useQuery({
    queryKey: ['org-designations'],
    queryFn: () => orgApi.listDesignations().then(r => r.data),
  })

  const addDep = useMutation({
    mutationFn: () => orgApi.addDepartment({ name: depName, head: depHead }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-departments'] })
      setDepName('')
      setDepHead('')
    },
  })

  const addBu = useMutation({
    mutationFn: () => orgApi.addBusinessUnit({ name: buName, owner: buOwner }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-business-units'] })
      setBuName('')
      setBuOwner('')
    },
  })

  const addTeam = useMutation({
    mutationFn: () => orgApi.addTeam({ name: teamName, department: teamDept }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-teams'] })
      setTeamName('')
      setTeamDept('')
    },
  })

  const addLocation = useMutation({
    mutationFn: () => orgApi.addLocation(locationName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-locations'] })
      setLocationName('')
    },
  })

  const addDesignation = useMutation({
    mutationFn: () => orgApi.addDesignation(designationName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-designations'] })
      setDesignationName('')
    },
  })

  const departments: Department[] = depData ?? []
  const units: BusinessUnit[] = buData ?? []
  const teams: Team[] = teamData ?? []
  const locations: Location[] = locationData ?? []
  const designations: Designation[] = designationData ?? []

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="page-title">Organization Structure</h1>
        <p className="page-subtitle">Manage departments, business units, teams, locations, and roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Departments</h3>
          <div className="space-y-2 mb-4">
            {departments.map(dep => (
              <div key={dep.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dep.name}</p>
                  <p className="text-xs text-gray-500">Head: {dep.head}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input className="input" placeholder="Department name" value={depName} onChange={e => setDepName(e.target.value)} />
            <input className="input" placeholder="Department head" value={depHead} onChange={e => setDepHead(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => addDep.mutate()} disabled={!depName.trim()}>
              Add Department
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Units</h3>
          <div className="space-y-2 mb-4">
            {units.map(unit => (
              <div key={unit.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{unit.name}</p>
                  <p className="text-xs text-gray-500">Owner: {unit.owner}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input className="input" placeholder="Business unit" value={buName} onChange={e => setBuName(e.target.value)} />
            <input className="input" placeholder="Owner" value={buOwner} onChange={e => setBuOwner(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => addBu.mutate()} disabled={!buName.trim()}>
              Add Business Unit
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Teams</h3>
          <div className="space-y-2 mb-4">
            {teams.map(team => (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{team.name}</p>
                  <p className="text-xs text-gray-500">Department: {team.department}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input className="input" placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} />
            <input className="input" placeholder="Department" value={teamDept} onChange={e => setTeamDept(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => addTeam.mutate()} disabled={!teamName.trim()}>
              Add Team
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Locations</h3>
          <div className="space-y-2 mb-4">
            {locations.map(location => (
              <div key={location.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{location.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input className="input" placeholder="Location name" value={locationName} onChange={e => setLocationName(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => addLocation.mutate()} disabled={!locationName.trim()}>
              Add Location
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Designations</h3>
          <div className="space-y-2 mb-4">
            {designations.map(designation => (
              <div key={designation.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{designation.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <input className="input" placeholder="Designation name" value={designationName} onChange={e => setDesignationName(e.target.value)} />
            <button className="btn-primary w-full" onClick={() => addDesignation.mutate()} disabled={!designationName.trim()}>
              Add Designation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
