import { useState, useEffect } from 'react'
import {
  Search, Lock, Unlock, KeyRound, UserX, UserCheck,
  RefreshCw, X, UserPlus, Upload, Download, Edit, Trash2,
  Move, CheckSquare, Square, MoreVertical, Filter, FileText
} from 'lucide-react'
import {
  getUsers, disableUser, enableUser, unlockUser, resetPassword,
  createUser, updateUser, deleteUser, bulkImportUsers, moveUser,
  bulkModifyUsers, bulkMoveUsers, bulkUserAction, getOUs, bulkUpdateCsv
} from '../api'

export default function Users() {
  const [users, setUsers]               = useState([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [selected, setSelected]         = useState(null)
  const [showReset, setShowReset]       = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [showEdit, setShowEdit]         = useState(false)
  const [showMove, setShowMove]         = useState(false)
  const [newPassword, setNewPassword]   = useState('')
  const [message, setMessage]           = useState(null)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // ── Bulk selection state ──
  const [selectedUsers, setSelectedUsers]     = useState(new Set())
  const [showBulkMenu, setShowBulkMenu]       = useState(false)
  const [showBulkMove, setShowBulkMove]       = useState(false)
  const [showBulkModify, setShowBulkModify]   = useState(false)
  const [showBulkReset, setShowBulkReset]     = useState(false)
  const [statusFilter, setStatusFilter]       = useState('all')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async (q = '') => {
    setLoading(true)
    setSelectedUsers(new Set())
    try {
      const data = await getUsers(q ? { search: q } : {})
      setUsers(data.users || [])
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Failed to load users')
    }
    setLoading(false)
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadUsers(search)
  }

  const handleAction = async (action, username) => {
    try {
      if (action === 'disable') await disableUser(username)
      if (action === 'enable')  await enableUser(username)
      if (action === 'unlock')  await unlockUser(username)
      showMessage('success', `Action "${action}" successful for ${username}`)
      loadUsers(search)
    } catch (err) {
      showMessage('error', err.response?.data?.detail || `Failed: ${action}`)
    }
  }

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"?\n\nThis action cannot be undone.`)) return
    try {
      await deleteUser(username)
      showMessage('success', `User "${username}" deleted`)
      loadUsers(search)
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Delete failed')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters')
      return
    }
    try {
      await resetPassword(selected.username, newPassword, true)
      showMessage('success', `Password reset for ${selected.username}`)
      setShowReset(false)
      setNewPassword('')
      setSelected(null)
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Reset failed')
    }
  }

  // ── Bulk Selection ──
  const toggleSelectUser = (username) => {
    const newSet = new Set(selectedUsers)
    if (newSet.has(username)) newSet.delete(username)
    else newSet.add(username)
    setSelectedUsers(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.username)))
    }
  }

  // ── Bulk Actions ──
  const handleBulkAction = async (action) => {
    if (selectedUsers.size === 0) {
      showMessage('error', 'No users selected')
      return
    }
    if (action === 'delete' && !confirm(`Delete ${selectedUsers.size} users? Cannot be undone!`)) return
    if (!confirm(`Apply "${action}" to ${selectedUsers.size} users?`)) return
    try {
      const result = await bulkUserAction(Array.from(selectedUsers), action)
      showMessage('success', `${action}: ${result.success_count} succeeded, ${result.failed} failed`)
      setSelectedUsers(new Set())
      setShowBulkMenu(false)
      loadUsers(search)
    } catch (err) {
      showMessage('error', err.response?.data?.detail || 'Bulk action failed')
    }
  }

  // ── Filter by status ──
  const filteredUsers = statusFilter === 'all'
    ? users
    : users.filter(u => u.status === statusFilter)

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Users</h1>
          <p className="text-slate-400">
            {filteredUsers.length} of {users.length} users
            {selectedUsers.size > 0 && (
              <span className="ml-2 text-blue-400">• {selectedUsers.size} selected</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedUsers.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
              >
                <MoreVertical size={16} />
                Bulk Actions ({selectedUsers.size})
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                  <button onClick={() => handleBulkAction('enable')} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-green-400">
                    <UserCheck size={14} /> Enable Selected
                  </button>
                  <button onClick={() => handleBulkAction('disable')} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-red-400">
                    <UserX size={14} /> Disable Selected
                  </button>
                  <button onClick={() => handleBulkAction('unlock')} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-orange-400">
                    <Unlock size={14} /> Unlock Selected
                  </button>
                  <button onClick={() => { setShowBulkReset(true); setShowBulkMenu(false) }} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-blue-400">
                    <KeyRound size={14} /> Reset Password
                  </button>
                  <button onClick={() => { setShowBulkMove(true); setShowBulkMenu(false) }} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-cyan-400">
                    <Move size={14} /> Move to OU
                  </button>
                  <button onClick={() => { setShowBulkModify(true); setShowBulkMenu(false) }} className="w-full text-left px-4 py-2.5 hover:bg-slate-700 flex items-center gap-2 text-purple-400">
                    <Edit size={14} /> Bulk Modify
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
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <UserPlus size={16} /> New User
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Upload size={16} /> Bulk Import
          </button>
          {/* ✅ NEW: Bulk Update CSV Button */}
          <button
            onClick={() => setShowBulkUpdate(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2"
          >
            <FileText size={16} /> Bulk Update
          </button>
          <button
            onClick={() => loadUsers(search)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Message ── */}
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

      {/* ── Search & Filters ── */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2 min-w-[300px]">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
            Search
          </button>
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
            <option value="disabled">Disabled</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="hover:text-blue-400">
                    {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
                      ? <CheckSquare size={18} className="text-blue-400" />
                      : <Square size={18} />}
                  </button>
                </th>
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No users found</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-700/30 ${selectedUsers.has(u.username) ? 'bg-blue-500/10' : ''}`}
                  >
                    <td className="p-4">
                      <button onClick={() => toggleSelectUser(u.username)}>
                        {selectedUsers.has(u.username)
                          ? <CheckSquare size={18} className="text-blue-400" />
                          : <Square size={18} className="text-slate-500 hover:text-slate-300" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{u.displayName || u.username}</div>
                      <div className="text-xs text-slate-400">{u.username}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-300">{u.email || '—'}</td>
                    <td className="p-4 text-sm text-slate-300">{u.department || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        u.status === 'active'   ? 'bg-green-500/20 text-green-400'   :
                        u.status === 'locked'   ? 'bg-orange-500/20 text-orange-400' :
                                                  'bg-red-500/20 text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelected(u); setShowEdit(true) }}
                          className="p-2 hover:bg-slate-700 rounded text-purple-400"
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => { setSelected(u); setShowMove(true) }}
                          className="p-2 hover:bg-slate-700 rounded text-cyan-400"
                          title="Move to OU"
                        >
                          <Move size={16} />
                        </button>
                        <button
                          onClick={() => { setSelected(u); setShowReset(true) }}
                          className="p-2 hover:bg-slate-700 rounded text-blue-400"
                          title="Reset Password"
                        >
                          <KeyRound size={16} />
                        </button>
                        {u.locked && (
                          <button
                            onClick={() => handleAction('unlock', u.username)}
                            className="p-2 hover:bg-slate-700 rounded text-orange-400"
                            title="Unlock"
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                        {u.enabled ? (
                          <button
                            onClick={() => handleAction('disable', u.username)}
                            className="p-2 hover:bg-slate-700 rounded text-red-400"
                            title="Disable"
                          >
                            <UserX size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('enable', u.username)}
                            className="p-2 hover:bg-slate-700 rounded text-green-400"
                            title="Enable"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        {user.role === 'Admin' && (
                          <button
                            onClick={() => handleDelete(u.username)}
                            className="p-2 hover:bg-red-500/20 rounded text-red-400"
                            title="Delete User"
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

      {/* ── Modals ── */}
      {showReset && selected && (
        <Modal title="Reset Password" onClose={() => { setShowReset(false); setNewPassword('') }}>
          <p className="text-sm text-slate-400 mb-4">
            Resetting password for <span className="text-white font-medium">{selected.username}</span>
          </p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowReset(false); setNewPassword('') }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
            <button onClick={handleResetPassword} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">Reset Password</button>
          </div>
        </Modal>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={(msg) => { showMessage('success', msg); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showEdit && selected && (
        <EditUserModal
          user={selected}
          onClose={() => { setShowEdit(false); setSelected(null) }}
          onSuccess={(msg) => { showMessage('success', msg); loadUsers(); setShowEdit(false); setSelected(null) }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showMove && selected && (
        <MoveUserModal
          user={selected}
          onClose={() => { setShowMove(false); setSelected(null) }}
          onSuccess={(msg) => { showMessage('success', msg); loadUsers(); setShowMove(false); setSelected(null) }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onSuccess={(msg) => { showMessage('success', msg); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {/* ✅ NEW: Bulk Update CSV Modal */}
      {showBulkUpdate && (
        <BulkUpdateCsvModal
          onClose={() => setShowBulkUpdate(false)}
          onSuccess={(msg) => { showMessage('success', msg); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showBulkMove && (
        <BulkMoveModal
          usernames={Array.from(selectedUsers)}
          onClose={() => setShowBulkMove(false)}
          onSuccess={(msg) => { showMessage('success', msg); setShowBulkMove(false); setSelectedUsers(new Set()); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showBulkModify && (
        <BulkModifyModal
          usernames={Array.from(selectedUsers)}
          onClose={() => setShowBulkModify(false)}
          onSuccess={(msg) => { showMessage('success', msg); setShowBulkModify(false); setSelectedUsers(new Set()); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
        />
      )}

      {showBulkReset && (
        <BulkResetPasswordModal
          usernames={Array.from(selectedUsers)}
          onClose={() => setShowBulkReset(false)}
          onSuccess={(msg) => { showMessage('success', msg); setShowBulkReset(false); setSelectedUsers(new Set()); loadUsers() }}
          onError={(msg) => showMessage('error', msg)}
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
      <div className={`bg-slate-800 border border-slate-700 rounded-xl p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
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
// Edit User Modal
// ─────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSuccess, onError }) {
  const [form, setForm] = useState({
    firstName:            user.firstName            || '',
    lastName:             user.lastName             || '',
    displayName:          user.displayName          || '',
    email:                user.email                || '',
    upn:                  user.upn                  || '',
    department:           user.department           || '',
    title:                user.title                || '',
    company:              user.company              || '',
    description:          user.description          || '',
    office:               user.office               || '',
    phone:                user.phone                || '',
    manager:              user.manager              || '',
    passwordNeverExpires: user.passwordNeverExpires || false,
    accountDisabled:      !user.enabled,
  })
  const [saving, setSaving] = useState(false)
  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await updateUser(user.username, form)
      onSuccess(`User '${user.username}' updated`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Update failed')
    }
    setSaving(false)
  }

  return (
    <Modal title={`Edit User: ${user.username}`} onClose={onClose} wide>
      <div className="mb-4 p-3 bg-slate-900 rounded-lg">
        <div className="text-xs text-slate-400">Username</div>
        <div className="font-mono font-medium">{user.username}</div>
        <div className="text-xs text-slate-500 mt-1 truncate">{user.id}</div>
      </div>
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Personal Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name"   value={form.firstName}   onChange={v => update('firstName', v)} />
            <Input label="Last Name"    value={form.lastName}    onChange={v => update('lastName', v)} />
            <Input label="Display Name" value={form.displayName} onChange={v => update('displayName', v)} />
            <Input label="Email"        type="email" value={form.email} onChange={v => update('email', v)} />
            <Input label="UPN"          value={form.upn} onChange={v => update('upn', v)} placeholder="user@domain.local" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Job Info</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Title"      value={form.title}      onChange={v => update('title', v)} />
            <Input label="Department" value={form.department} onChange={v => update('department', v)} />
            <Input label="Company"    value={form.company}    onChange={v => update('company', v)} />
            <Input label="Office"     value={form.office}     onChange={v => update('office', v)} />
            <Input label="Phone"      value={form.phone}      onChange={v => update('phone', v)} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Additional</h4>
          <div className="space-y-4">
            <Input label="Description" value={form.description} onChange={v => update('description', v)} />
            <Input label="Manager DN"  value={form.manager}     onChange={v => update('manager', v)} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Account Options</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700/50">
              <input type="checkbox" checked={form.passwordNeverExpires}
                     onChange={(e) => update('passwordNeverExpires', e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-sm font-medium">Password Never Expires</div>
                <div className="text-xs text-slate-500">User won't be forced to change password</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700/50">
              <input type="checkbox" checked={form.accountDisabled}
                     onChange={(e) => update('accountDisabled', e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-sm font-medium">Account Disabled</div>
                <div className="text-xs text-slate-500">User cannot log in</div>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-700">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Move User Modal (Single)
// ─────────────────────────────────────────────────────────
function MoveUserModal({ user, onClose, onSuccess, onError }) {
  const [ous, setOus]           = useState([])
  const [targetOu, setTargetOu] = useState('')
  const [moving, setMoving]     = useState(false)

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const handleMove = async () => {
    if (!targetOu) { onError('Select a target OU'); return }
    setMoving(true)
    try {
      await moveUser(user.username, targetOu)
      onSuccess(`Moved ${user.username} to ${targetOu}`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Move failed')
    }
    setMoving(false)
  }

  return (
    <Modal title="Move User" onClose={onClose}>
      <div className="mb-4 p-3 bg-slate-900 rounded-lg">
        <div className="text-xs text-slate-400">User</div>
        <div className="font-medium">{user.displayName || user.username}</div>
        <div className="text-xs text-slate-500 mt-1">Current OU:</div>
        <div className="text-xs font-mono truncate">{user.ou}</div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-2">Move to OU</label>
        <select value={targetOu} onChange={(e) => setTargetOu(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500">
          <option value="">Select target OU...</option>
          {ous.map(o => <option key={o.dn} value={o.dn}>{o.dn}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleMove} disabled={moving || !targetOu} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50">
          {moving ? 'Moving...' : 'Move User'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Bulk Move Modal
// ─────────────────────────────────────────────────────────
function BulkMoveModal({ usernames, onClose, onSuccess, onError }) {
  const [ous, setOus]           = useState([])
  const [targetOu, setTargetOu] = useState('')
  const [moving, setMoving]     = useState(false)

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const handleMove = async () => {
    if (!targetOu) { onError('Select target OU'); return }
    setMoving(true)
    try {
      const result = await bulkMoveUsers(usernames, targetOu)
      onSuccess(`Moved ${result.moved} of ${result.total} users`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Bulk move failed')
    }
    setMoving(false)
  }

  return (
    <Modal title={`Move ${usernames.length} Users`} onClose={onClose}>
      <div className="mb-4 p-3 bg-slate-900 rounded-lg max-h-32 overflow-y-auto">
        <div className="text-xs text-slate-400 mb-2">Selected users:</div>
        <div className="text-sm font-mono">{usernames.join(', ')}</div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-2">Move all to OU</label>
        <select value={targetOu} onChange={(e) => setTargetOu(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg">
          <option value="">Select target OU...</option>
          {ous.map(o => <option key={o.dn} value={o.dn}>{o.dn}</option>)}
        </select>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleMove} disabled={moving || !targetOu} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50">
          {moving ? 'Moving...' : `Move ${usernames.length} Users`}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Bulk Modify Modal
// ─────────────────────────────────────────────────────────
function BulkModifyModal({ usernames, onClose, onSuccess, onError }) {
  const [fields, setFields] = useState({
    department: '', title: '', company: '', office: '',
    phone: '', description: '', manager: ''
  })
  const [enabledFields, setEnabledFields] = useState({})
  const [modifying, setModifying]         = useState(false)

  const toggleField = (key) => {
    setEnabledFields(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleModify = async () => {
    const toApply = {}
    Object.keys(enabledFields).forEach(key => {
      if (enabledFields[key]) toApply[key] = fields[key]
    })
    if (Object.keys(toApply).length === 0) {
      onError('Enable at least one field to modify')
      return
    }
    if (!confirm(`Apply changes to ${usernames.length} users?\n\nChanges: ${JSON.stringify(toApply, null, 2)}`)) return
    setModifying(true)
    try {
      const updates = usernames.map(username => ({ username, ...toApply }))
      const result  = await bulkModifyUsers(updates)
      onSuccess(`Modified ${result.updated} of ${result.total} users`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Bulk modify failed')
    }
    setModifying(false)
  }

  const FieldRow = ({ name, label }) => (
    <div className="flex items-center gap-3">
      <input type="checkbox" checked={enabledFields[name] || false}
             onChange={() => toggleField(name)} className="w-4 h-4 flex-shrink-0" />
      <label className="w-32 text-sm text-slate-400">{label}</label>
      <input type="text" value={fields[name]} disabled={!enabledFields[name]}
             onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
             className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg disabled:opacity-30" />
    </div>
  )

  return (
    <Modal title={`Bulk Modify ${usernames.length} Users`} onClose={onClose} wide>
      <p className="text-sm text-slate-400 mb-4">
        ✓ Check the fields you want to update. Unchecked fields will be left as is.
      </p>
      <div className="space-y-3 bg-slate-900 p-4 rounded-lg">
        <FieldRow name="department"  label="Department" />
        <FieldRow name="title"       label="Title" />
        <FieldRow name="company"     label="Company" />
        <FieldRow name="office"      label="Office" />
        <FieldRow name="phone"       label="Phone" />
        <FieldRow name="description" label="Description" />
        <FieldRow name="manager"     label="Manager (DN)" />
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleModify} disabled={modifying} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
          {modifying ? 'Modifying...' : 'Apply Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// ✅ Bulk Update from CSV Modal
// ─────────────────────────────────────────────────────────
function BulkUpdateCsvModal({ onClose, onSuccess, onError }) {
  const [csvText, setCsvText]   = useState('')
  const [rows, setRows]         = useState([])
  const [updating, setUpdating] = useState(false)
  const [result, setResult]     = useState(null)

  const parseCsv = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const obj = {}
      headers.forEach((h, i) => { obj[h] = values[i] || '' })
      return obj
    })
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsvText(text)
      setRows(parseCsv(text))
    }
    reader.readAsText(file)
  }

  const handleTextChange = (text) => {
    setCsvText(text)
    setRows(parseCsv(text))
  }

  const downloadTemplate = () => {
    const template = [
      'username,department,title,office,phone,email,company,description',
      'john.doe,Information Technology,Senior Developer,Building A,555-1234,john.doe@abasyn.local,Abasyn,',
      'jane.smith,Human Resources,HR Manager,Building B,555-5678,jane.smith@abasyn.local,Abasyn,'
    ].join('\n')
    const blob = new Blob([template], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'bulk_update_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpdate = async () => {
    if (rows.length === 0) { onError('No data to update'); return }
    if (!confirm(
      `Update ${rows.length} users?\n\nOnly fields with values will be updated.\nEmpty fields will be skipped.`
    )) return
    setUpdating(true)
    try {
      const res = await bulkUpdateCsv(rows)
      setResult(res)
      if (res.failed === 0) {
        onSuccess(`Successfully updated ${res.updated} of ${res.total} users`)
      }
    } catch (err) {
      onError(err.response?.data?.detail || 'Bulk update failed')
    }
    setUpdating(false)
  }

  return (
    <Modal title="Bulk Update Users from CSV" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Info banner */}
        <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-lg text-sm">
          <p className="text-blue-300 font-medium mb-1">ℹ️ How this works:</p>
          <ul className="text-slate-300 space-y-1 list-disc list-inside text-xs">
            <li>CSV must have a <code className="bg-slate-900 px-1 rounded">username</code> column (required)</li>
            <li>Other columns: <code className="bg-slate-900 px-1 rounded">department, title, office, phone, email, company, description</code></li>
            <li>Empty cells are skipped — existing AD values are kept</li>
            <li>Users must already exist in AD (does NOT create new users)</li>
          </ul>
        </div>

        {/* File upload + template */}
        <div className="flex gap-2">
          <input
            type="file" accept=".csv"
            onChange={handleFileUpload}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm"
          />
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm whitespace-nowrap flex items-center gap-1"
          >
            <Download size={14} /> Template
          </button>
        </div>

        {/* Paste area */}
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Or paste CSV text:</label>
          <textarea
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={6}
            placeholder="username,department,title&#10;john.doe,IT,Developer&#10;jane.smith,HR,Manager"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono"
          />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-sm text-slate-300 mb-2 font-medium">
              Preview ({rows.length} {rows.length === 1 ? 'row' : 'rows'}):
            </p>
            <div className="max-h-40 overflow-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    {Object.keys(rows[0]).map(k => (
                      <th key={k} className="text-left p-1">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="p-1 text-slate-300">{v || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="text-slate-500 mt-1 text-xs">... and {rows.length - 5} more rows</p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-slate-900 p-3 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-2xl font-bold text-white">{result.total}</p>
                <p className="text-xs text-slate-400 mt-1">Total</p>
              </div>
              <div className="bg-green-900/30 border border-green-700/30 p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{result.updated}</p>
                <p className="text-xs text-slate-400 mt-1">Updated</p>
              </div>
              <div className="bg-red-900/30 border border-red-700/30 p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-slate-400 mt-1">Failed</p>
              </div>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="max-h-40 overflow-auto text-xs bg-slate-950 p-2 rounded">
                <p className="text-red-400 mb-2 font-medium">Errors:</p>
                {result.errors.map((e, i) => (
                  <div key={i} className="text-slate-400 mb-1">
                    Row {e.row} (<span className="font-mono text-white">{e.username}</span>):{' '}
                    <span className="text-red-300">{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleUpdate}
              disabled={updating || rows.length === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={16} />
              {updating ? 'Updating...' : `Update ${rows.length} User${rows.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Bulk Reset Password Modal
// ─────────────────────────────────────────────────────────
function BulkResetPasswordModal({ usernames, onClose, onSuccess, onError }) {
  const [password, setPassword]       = useState('')
  const [forceChange, setForceChange] = useState(true)
  const [resetting, setResetting]     = useState(false)

  const handleReset = async () => {
    if (!password || password.length < 8) {
      onError('Password must be at least 8 characters')
      return
    }
    if (!confirm(`Reset password for ${usernames.length} users?`)) return
    setResetting(true)
    try {
      const result = await bulkUserAction(usernames, 'reset-password', { password, forceChange })
      onSuccess(`Reset ${result.success_count} of ${result.total} passwords`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Bulk reset failed')
    }
    setResetting(false)
  }

  return (
    <Modal title={`Reset Password for ${usernames.length} Users`} onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">All selected users will get the same new password.</p>
      <input
        type="password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 chars)"
        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
        autoFocus
      />
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={forceChange} onChange={(e) => setForceChange(e.target.checked)} />
        <span className="text-sm">Force users to change password at next login</span>
      </label>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleReset} disabled={resetting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
          {resetting ? 'Resetting...' : 'Reset Passwords'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Create User Modal
// ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess, onError }) {
  const [form, setForm] = useState({
    username: '', firstName: '', lastName: '', displayName: '',
    email: '', department: '', title: '', password: '',
    ou: '', passwordNeverExpires: false, mustChangePassword: true
  })
  const [ous, setOus]     = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getOUs().then(d => setOus(d.ous || [])).catch(() => {})
  }, [])

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.firstName) {
      onError('Username, First Name, and Password are required')
      return
    }
    if (form.password.length < 8) {
      onError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      const data = {
        ...form,
        displayName: form.displayName || `${form.firstName} ${form.lastName}`.trim()
      }
      await createUser(data)
      onSuccess(`User '${form.username}' created`)
      onClose()
    } catch (err) {
      onError(err.response?.data?.detail || 'Create failed')
    }
    setSaving(false)
  }

  return (
    <Modal title="Create New User" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Username *"   value={form.username}    onChange={v => update('username', v)} />
        <Input label="First Name *" value={form.firstName}   onChange={v => update('firstName', v)} />
        <Input label="Last Name"    value={form.lastName}    onChange={v => update('lastName', v)} />
        <Input label="Display Name" value={form.displayName} onChange={v => update('displayName', v)} placeholder="Auto-filled" />
        <Input label="Email"        type="email" value={form.email} onChange={v => update('email', v)} />
        <Input label="Department"   value={form.department}  onChange={v => update('department', v)} />
        <Input label="Job Title"    value={form.title}       onChange={v => update('title', v)} />
        <Input label="Password *"   type="password" value={form.password} onChange={v => update('password', v)} />
        <div className="md:col-span-2">
          <label className="block text-sm text-slate-400 mb-2">Target OU</label>
          <select value={form.ou} onChange={(e) => update('ou', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg">
            <option value="">Default OU</option>
            {ous.map(ou => <option key={ou.dn} value={ou.dn}>{ou.dn}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.mustChangePassword}
                 onChange={(e) => update('mustChangePassword', e.target.checked)} />
          <span className="text-sm">Must change password at next logon</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.passwordNeverExpires}
                 onChange={(e) => update('passwordNeverExpires', e.target.checked)} />
          <span className="text-sm">Password never expires</span>
        </label>
      </div>
      <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-700">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
          {saving ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Bulk Import Modal (Create new users)
// ─────────────────────────────────────────────────────────
function BulkImportModal({ onClose, onSuccess, onError }) {
  const [csvText, setCsvText]     = useState('')
  const [users, setUsers]         = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults]     = useState(null)

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { setUsers([]); return }
    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const row = {}
      headers.forEach((h, i) => row[h] = values[i] || '')
      return row
    })
    setUsers(rows)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      setCsvText(evt.target.result)
      parseCSV(evt.target.result)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (users.length === 0) { onError('No users to import'); return }
    setImporting(true)
    try {
      const result = await bulkImportUsers(users)
      setResults(result)
      onSuccess(`Imported ${result.created} of ${result.total} users`)
    } catch (err) {
      onError(err.response?.data?.detail || 'Import failed')
    }
    setImporting(false)
  }

  const downloadTemplate = () => {
    const csv = [
      'username,firstName,lastName,displayName,email,password,department,title',
      'jdoe,John,Doe,John Doe,jdoe@abasyn.local,TempPass123!,IT,Developer',
      'asmith,Alice,Smith,Alice Smith,asmith@abasyn.local,TempPass123!,HR,Manager'
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'users-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Bulk Import Users" onClose={onClose} wide>
      {!results ? (
        <>
          <div className="mb-4 p-4 bg-slate-900 rounded-lg">
            <div className="text-sm text-slate-300 mb-2">Required CSV columns:</div>
            <code className="text-xs text-green-400 block">
              username, firstName, lastName, email, password, department, title
            </code>
            <button onClick={downloadTemplate} className="mt-3 text-sm text-blue-400 hover:underline flex items-center gap-1">
              <Download size={14} /> Download Template
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Upload CSV File</label>
            <input type="file" accept=".csv" onChange={handleFile}
                   className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-2">Or Paste CSV</label>
            <textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); parseCSV(e.target.value) }}
              placeholder="username,firstName,lastName,email,password..."
              rows={6}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono"
            />
          </div>
          {users.length > 0 && (
            <div className="mb-4 p-3 bg-slate-900 rounded-lg max-h-60 overflow-y-auto">
              <div className="text-sm font-medium mb-2">Preview ({users.length} users):</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left p-1">Username</th>
                    <th className="text-left p-1">Name</th>
                    <th className="text-left p-1">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((u, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="p-1">{u.username}</td>
                      <td className="p-1">{u.firstName} {u.lastName}</td>
                      <td className="p-1">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length > 10 && (
                <div className="text-xs text-slate-500 mt-2">+ {users.length - 10} more...</div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
            <button
              onClick={handleImport}
              disabled={importing || users.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${users.length} Users`}
            </button>
          </div>
        </>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-slate-900 rounded-lg text-center">
              <div className="text-2xl font-bold">{results.total}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">{results.created}</div>
              <div className="text-xs text-slate-400">Created</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">{results.failed}</div>
              <div className="text-xs text-slate-400">Failed</div>
            </div>
          </div>
          {results.errors.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2 text-red-400">Errors:</div>
              <div className="max-h-40 overflow-y-auto bg-slate-900 rounded-lg p-3">
                {results.errors.map((err, i) => (
                  <div key={i} className="text-xs text-red-300 mb-1">
                    <span className="font-mono">{err.username}</span>: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
            Close
          </button>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────
// Input Component
// ─────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}