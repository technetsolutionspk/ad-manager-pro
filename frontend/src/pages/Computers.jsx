import { useState, useEffect } from 'react'
import {
  Search, RefreshCw, Monitor, Plus, Trash2, X, Move,
  CheckSquare, Square, MoreVertical, MonitorCheck, MonitorX,
  Filter, Edit, Download
} from 'lucide-react'
import {
  getComputers, createComputer, deleteComputer,
  enableComputer, disableComputer, moveComputer, getOUs
} from '../api'

export default function Computers() {
  const [computers, setComputers]       = useState([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [selected, setSelected]         = useState(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [showMove, setShowMove]         = useState(false)
  const [message, setMessage]           = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // ── Bulk selection ──
  const [selectedComputers, setSelectedComputers] = useState(new Set())
  const [showBulkMenu, setShowBulkMenu]           = useState(false)
  const [showBulkMove, setShowBulkMove]           = useState(false)

  useEffect(() => { load() }, [])

  const load = async (q = '') => {
    setLoading(true)
    setSelectedComputers(new Set())
    try {
      const data = await getComputers(q ? { search: q } : {})
      setComputers(data.computers || [])
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to load')
    }
    setLoading(false)
  }

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleAction = async (action, name) => {
    try {
      if (action === 'enable')  await enableComputer(name)
      if (action === 'disable') await disableComputer(name)
      showMsg('success', `Computer "${name}" ${action}d`)
      load(search)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || `Failed: ${action}`)
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Delete computer "${name}"?\n\nThis cannot be undone.`)) return
    try {
      await deleteComputer(name)
      showMsg('success', `Computer "${name}" deleted`)
      load(search)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Delete failed')
    }
  }

  // ── Bulk Selection ──
  const toggleSelect = (name) => {
    const newSet = new Set(selectedComputers)
    if (newSet.has(name)) newSet.delete(name)
    else newSet.add(name)
    setSelectedComputers(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedComputers.size === filteredComputers.length) {
      setSelectedComputers(new Set())
    } else {
      setSelectedComputers(new Set(filteredComputers.map(c => c.name)))
    }
  }

  // ── Bulk Actions ──
  const handleBulkAction = async (action) => {
    if (selectedComputers.size === 0) {
      showMsg('error', 'No computers selected')
      return
    }
    if (action === 'delete' && !confirm(`Delete ${selectedComputers.size} computers? Cannot be undone!`)) return
    if (!confirm(`Apply "${action}" to ${selectedComputers.size} computers?`)) return

    let success = 0, failed = 0
    for (const name of selectedComputers) {
      try {
        if (action === 'enable')  await enableComputer(name)
        if (action === 'disable') await disableComputer(name)
        if (action === 'delete')  await deleteComputer(name)
        success++
      } catch (err) {
        failed++
      }
    }

    showMsg('success', `${action}: ${success} succeeded, ${failed} failed`)
    setSelectedComputers(new Set())
    setShowBulkMenu(false)
    load(search)
  }

  // ── Export ──
  const handleExport = () => {
    const headers = ['Name', 'DNS Name', 'Operating System', 'OS Version', 'Status', 'Last Logon', 'OU']
    const rows = filteredComputers.map(c => [
      c.name, c.dnsName, c.os, c.osVersion, c.status, c.lastLogon, c.ou
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `computers-${Date.now()}.csv`
    a.click()
    showMsg('success', `Exported ${filteredComputers.length} computers`)
  }

  // ── Filtered List ──
  const filteredComputers = statusFilter === 'all'
    ? computers
    : computers.filter(c => c.status === statusFilter)

  return (
    <div className="p-8">
      {/* ── Header ──────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Computers</h1>
          <p className="text-slate-400">
            {filteredComputers.length} of {computers.length} computers
            {selectedComputers.size > 0 && <span className="ml-2 text-blue-400">• {selectedComputers.size} selected</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedComputers.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
              >
                <MoreVertical size={16} />
                Bulk Actions ({selectedComputers.size})
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                  <button onClick={() => handleBulkAction('enable')} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-green-400">
                    <MonitorCheck size={14} /> Enable Selected
                  </button>
                  <button onClick={() => handleBulkAction('disable')} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-red-400">
                    <MonitorX size={14} /> Disable Selected
                  </button>
                  <button onClick={() => { setShowBulkMove(true); setShowBulkMenu(false) }} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-cyan-400">
                    <Move size={14} /> Move to OU
                  </button>
                  {user.role === 'Admin' && (
                    <button onClick={() => handleBulkAction('delete')} className="w-full text-left px-4 py-2.5 hover:bg-red-500/20 flex items-center gap-2 text-red-400 border-t border-slate-700">
                      <Trash2 size={14} /> Delete Selected
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {user.role === 'Admin' && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              <Plus size={16} /> New Computer
            </button>
          )}
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => load(search)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Message ─────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      )}

      {/* ── Search & Filter ──────────────────── */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <form onSubmit={(e) => { e.preventDefault(); load(search) }} className="flex-1 flex gap-2 min-w-[300px]">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search computers..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg">Search</button>
        </form>

        <div className="flex gap-2 items-center bg-slate-800 border border-slate-700 rounded-lg px-3">
          <Filter size={16} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent py-2 focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* ── Computers Table ─────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="hover:text-blue-400">
                    {selectedComputers.size === filteredComputers.length && filteredComputers.length > 0
                      ? <CheckSquare size={18} className="text-blue-400" />
                      : <Square size={18} />}
                  </button>
                </th>
                <th className="p-4">Computer</th>
                <th className="p-4">OS</th>
                <th className="p-4">DNS Name</th>
                <th className="p-4">Last Logon</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">
                  <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                  Loading computers...
                </td></tr>
              ) : filteredComputers.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">No computers found</td></tr>
              ) : (
                filteredComputers.map(c => (
                  <tr key={c.id}
                      className={`hover:bg-slate-700/30 ${selectedComputers.has(c.name) ? 'bg-blue-500/10' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelect(c.name)}>
                        {selectedComputers.has(c.name)
                          ? <CheckSquare size={18} className="text-blue-400" />
                          : <Square size={18} className="text-slate-500 hover:text-slate-300" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Monitor size={18} className="text-purple-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{c.name}</div>
                          {c.description && <div className="text-xs text-slate-400">{c.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div>{c.os || '—'}</div>
                      {c.osVersion && <div className="text-xs text-slate-500">{c.osVersion}</div>}
                    </td>
                    <td className="p-4 text-sm text-slate-400 font-mono">{c.dnsName || '—'}</td>
                    <td className="p-4 text-sm text-slate-400">
                      {c.lastLogon ? (
                        <span title={c.lastLogon}>{new Date(c.lastLogon).toLocaleDateString()}</span>
                      ) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        c.status === 'active'   ? 'bg-green-500/20 text-green-400'    :
                        c.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-400' :
                                                  'bg-red-500/20 text-red-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelected(c); setShowMove(true) }}
                          className="p-2 hover:bg-slate-700 rounded text-cyan-400"
                          title="Move to OU"
                        >
                          <Move size={16} />
                        </button>
                        {c.enabled ? (
                          <button
                            onClick={() => handleAction('disable', c.name)}
                            className="p-2 hover:bg-slate-700 rounded text-red-400"
                            title="Disable"
                          >
                            <MonitorX size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('enable', c.name)}
                            className="p-2 hover:bg-slate-700 rounded text-green-400"
                            title="Enable"
                          >
                            <MonitorCheck size={16} />
                          </button>
                        )}
                        {user.role === 'Admin' && (
                          <button
                            onClick={() => handleDelete(c.name)}
                            className="p-2 hover:bg-red-500/20 rounded text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ──────────────────────────── */}
      {showCreate && (
        <CreateComputerModal
          onClose={() => setShowCreate(false)}
          onSuccess={(msg) => { showMsg('success', msg); load() }}
          onError={(msg) => showMsg('error', msg)}
        />
      )}

      {showMove && selected && (
        <MoveComputerModal
          computer={selected}
          onClose={() => { setShowMove(false); setSelected(null) }}
          onSuccess={(msg) => { showMsg('success', msg); load(); setShowMove(false); setSelected(null) }}
          onError={(msg) => showMsg('error', msg)}
        />
      )}

      {showBulkMove && (
        <BulkMoveModal
          computers={Array.from(selectedComputers)}
          onClose={() => setShowBulkMove(false)}
          onSuccess={(msg) => {
            showMsg('success', msg)
            setShowBulkMove(false)
            setSelectedComputers(new Set())
            load()
          }}
          onError={(msg) => showMsg('error', msg)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Modal Wrapper
// ─────────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className={`bg-slate-800 border border-slate-700 rounded-xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Create Computer Modal
// ─────────────────────────────────────────────────────────
function CreateComputerModal({ onClose, onSuccess, onError }) {
  const [form, setForm] = useState({ name: '', description: '', ou: '' })
  const [ous, setOus] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.name) {
      onError('Computer name is required')
      return
    }
    if (form.name.length > 15) {
      onError('Computer name must be 15 characters or less')
      return
    }
    if (!/^[a-zA-Z0-9-]+$/.test(form.name)) {
      onError('Computer name can only contain letters, numbers, and hyphens')
      return
    }

    setSaving(true)
    try {
      await createComputer(form)
      onSuccess(`Computer "${form.name}" created`)
      onClose()
    } catch (err) {
      onError(err.response?.data?.detail || 'Create failed')
    }
    setSaving(false)
  }

  return (
    <Modal title="Create New Computer" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Computer Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
            placeholder="e.g. PC-001"
            maxLength={15}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1">
            Max 15 chars, letters/numbers/hyphens only • Will be created as {form.name || 'NAME'}$
          </p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional - e.g. John's Workstation"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Target OU</label>
          <select
            value={form.ou}
            onChange={(e) => setForm({ ...form, ou: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg"
          >
            <option value="">Default Computers Container</option>
            {ous.map(ou => <option key={ou.dn} value={ou.dn}>{ou.dn}</option>)}
          </select>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
          ℹ️ Note: This creates an empty computer account. The actual computer must be joined to the domain using the corresponding name.
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Computer'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Move Computer Modal (Single)
// ─────────────────────────────────────────────────────────
function MoveComputerModal({ computer, onClose, onSuccess, onError }) {
  const [ous, setOus]           = useState([])
  const [targetOu, setTargetOu] = useState('')
  const [moving, setMoving]     = useState(false)

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const handleMove = async () => {
    if (!targetOu) {
      onError('Select target OU')
      return
    }
    setMoving(true)
    try {
      await moveComputer(computer.name, targetOu)
      onSuccess(`Moved ${computer.name} to ${targetOu}`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Move failed')
    }
    setMoving(false)
  }

  return (
    <Modal title="Move Computer" onClose={onClose}>
      <div className="mb-4 p-3 bg-slate-900 rounded-lg">
        <div className="text-xs text-slate-400">Computer</div>
        <div className="font-medium flex items-center gap-2">
          <Monitor size={16} className="text-purple-400" />
          {computer.name}
        </div>
        {computer.os && <div className="text-xs text-slate-500 mt-1">{computer.os}</div>}
        <div className="text-xs text-slate-500 mt-1">Current OU:</div>
        <div className="text-xs font-mono truncate">{computer.ou}</div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Move to OU</label>
        <select
          value={targetOu}
          onChange={(e) => setTargetOu(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">Select target OU...</option>
          {ous.map(o => <option key={o.dn} value={o.dn}>{o.dn}</option>)}
        </select>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleMove} disabled={moving || !targetOu} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50">
          {moving ? 'Moving...' : 'Move Computer'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Bulk Move Modal
// ─────────────────────────────────────────────────────────
function BulkMoveModal({ computers, onClose, onSuccess, onError }) {
  const [ous, setOus]           = useState([])
  const [targetOu, setTargetOu] = useState('')
  const [moving, setMoving]     = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const handleMove = async () => {
    if (!targetOu) {
      onError('Select target OU')
      return
    }
    setMoving(true)
    setProgress({ done: 0, total: computers.length })

    let success = 0
    let failed = 0
    for (let i = 0; i < computers.length; i++) {
      try {
        await moveComputer(computers[i], targetOu)
        success++
      } catch (err) {
        failed++
      }
      setProgress({ done: i + 1, total: computers.length })
    }

    onSuccess(`Moved ${success} of ${computers.length} computers (${failed} failed)`)
    setMoving(false)
  }

  return (
    <Modal title={`Move ${computers.length} Computers`} onClose={onClose}>
      <div className="mb-4 p-3 bg-slate-900 rounded-lg max-h-32 overflow-y-auto">
        <div className="text-xs text-slate-400 mb-2">Selected computers:</div>
        <div className="text-sm font-mono">{computers.join(', ')}</div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Move all to OU</label>
        <select
          value={targetOu}
          onChange={(e) => setTargetOu(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg"
        >
          <option value="">Select target OU...</option>
          {ous.map(o => <option key={o.dn} value={o.dn}>{o.dn}</option>)}
        </select>
      </div>

      {moving && (
        <div className="mt-4 p-3 bg-slate-900 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span>Moving computers...</span>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} disabled={moving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50">Cancel</button>
        <button onClick={handleMove} disabled={moving || !targetOu} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50">
          {moving ? `Moving... (${progress.done}/${progress.total})` : `Move ${computers.length} Computers`}
        </button>
      </div>
    </Modal>
  )
}