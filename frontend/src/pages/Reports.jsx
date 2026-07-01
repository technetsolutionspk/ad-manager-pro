import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import {
  Users, Shield, Monitor, FolderTree, Lock, KeyRound, AlertCircle,
  UserX, Building, Activity, RefreshCw, Clock, UserCheck,
  Download, BarChart3, X, Eye
} from 'lucide-react'
import {
  getReportSummary, getUsersByDepartment, getComputersByOS, exportReport
} from '../api'

export default function Reports() {
  const navigate = useNavigate()
  const [summary, setSummary]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [message, setMessage]     = useState(null)

  useEffect(() => { loadSummary() }, [])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const data = await getReportSummary()
      setSummary(data)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to load')
    }
    setLoading(false)
  }

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleExport = async (type, name) => {
    try {
      const res = await exportReport(type)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = name + '-' + Date.now() + '.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showMsg('success', 'Exported ' + name)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Export failed')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-500 py-16">
          <RefreshCw size={48} className="mx-auto mb-3 animate-spin text-blue-500" />
          <p className="text-lg">Loading reports...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-8">
        <div className="text-center text-red-400 py-16">
          <AlertCircle size={48} className="mx-auto mb-3" />
          <p>Failed to load dashboard data</p>
          <button onClick={loadSummary} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="text-blue-400" size={24} />
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Domain:</span>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
              <Building size={16} className="text-blue-400" />
              <span className="font-medium">abasyn.local</span>
            </div>
          </div>
          <button onClick={loadSummary} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={'mb-4 p-3 rounded-lg flex items-center justify-between ' +
          (message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300')}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      )}

      {/* Top Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <QuickStatCard icon={Lock} iconColor="text-red-500" iconBg="bg-red-500/10"
          value={summary.users.locked} label="Locked Out Users"
          action="Unlock" onAction={() => navigate('/users')} />
        <QuickStatCard icon={KeyRound} iconColor="text-yellow-500" iconBg="bg-yellow-500/10"
          value={summary.users.passwordNeverExpires} label="Passwords Never Expire"
          action="View Details" onAction={() => navigate('/reports')} />
        <QuickStatCard icon={KeyRound} iconColor="text-orange-500" iconBg="bg-orange-500/10"
          value={summary.users.mustChangePassword} label="Must Change Password"
          action="Options" onAction={() => navigate('/reports')} />
        <QuickStatCard icon={Clock} iconColor="text-pink-500" iconBg="bg-pink-500/10"
          value={summary.users.inactive30Days + summary.users.inactive90Days + summary.users.inactive180Days}
          label="Inactive Users (30+ days)"
          action="Options" onAction={() => navigate('/reports')} />
      </div>

      {/* User Reports & System Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UserReportsCard summary={summary} />
        <SystemReportsCard summary={summary} />
      </div>

      {/* Logged On & Groups Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LoggedOnReportCard summary={summary} />
        <GroupsAndOUsCard summary={summary} />
      </div>

      {/* Departments & OS Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DepartmentsChart />
        <OperatingSystemChart />
      </div>

      {/* Quick Export */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Download size={20} className="text-blue-400" />
          Quick Export
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Download CSV reports for analysis in Excel
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ExportButton onClick={() => handleExport('all-users', 'all-users')} label="All Users" />
          <ExportButton onClick={() => handleExport('active-users', 'active-users')} label="Active Users" />
          <ExportButton onClick={() => handleExport('disabled-users', 'disabled-users')} label="Disabled Users" />
          <ExportButton onClick={() => handleExport('locked-users', 'locked-users')} label="Locked Users" />
          <ExportButton onClick={() => handleExport('never-logged-in', 'never-logged-in')} label="Never Logged In" />
          <ExportButton onClick={() => handleExport('inactive-users', 'inactive-users')} label="Inactive (90+ days)" />
          <ExportButton onClick={() => handleExport('all-groups', 'all-groups')} label="All Groups" />
          <ExportButton onClick={() => handleExport('all-computers', 'all-computers')} label="All Computers" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Quick Stat Card
// ─────────────────────────────────────────────────────────
function QuickStatCard({ icon: Icon, iconColor, iconBg, value, label, action, onAction }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-slate-600 transition">
      <div className="flex items-start justify-between mb-3">
        <div className={'p-3 rounded-lg ' + iconBg}>
          <Icon size={28} className={iconColor} />
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400 mt-1">{label}</div>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-700">
        <button onClick={onAction} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
          {action} <span>›</span>
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// User Reports Card
// ─────────────────────────────────────────────────────────
function UserReportsCard({ summary }) {
  const data = [
    { name: 'Total Users',    value: summary.users.total,           color: '#06b6d4' },
    { name: 'Inactive 30d',   value: summary.users.inactive30Days,  color: '#22c55e' },
    { name: 'Disabled',       value: summary.users.disabled,        color: '#ec4899' },
    { name: 'Locked',         value: summary.users.locked,          color: '#3b82f6' },
    { name: 'Pwd Expired',    value: summary.users.mustChangePassword, color: '#a855f7' },
  ]
  return (
    <Card title="User Reports">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        <LegendRow label="Number of users" value={summary.users.total} color="#06b6d4" />
        <LegendRow label="Inactive users in 30 days" value={summary.users.inactive30Days} color="#22c55e" />
        <LegendRow label="Disabled Users" value={summary.users.disabled} color="#ec4899" />
        <LegendRow label="Locked-out Users" value={summary.users.locked} color="#3b82f6" />
        <LegendRow label="Password Expired Users" value={summary.users.mustChangePassword} color="#a855f7" />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// System Reports Card
// ─────────────────────────────────────────────────────────
function SystemReportsCard({ summary }) {
  const data = [
    { name: 'Total',     value: summary.computers.total,    color: '#06b6d4' },
    { name: 'Inactive',  value: summary.computers.inactive, color: '#22c55e' },
    { name: 'Disabled',  value: summary.computers.disabled, color: '#ec4899' },
    { name: 'Active',    value: summary.computers.active,   color: '#3b82f6' },
  ]
  return (
    <Card title="System Reports">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        <LegendRow label="Number of computers" value={summary.computers.total} color="#06b6d4" />
        <LegendRow label="Inactive computers in 30 days" value={summary.computers.inactive} color="#22c55e" />
        <LegendRow label="Disabled Computers" value={summary.computers.disabled} color="#ec4899" />
        <LegendRow label="Active Workstations" value={summary.computers.active} color="#3b82f6" />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Logged On User Report
// ─────────────────────────────────────────────────────────
function LoggedOnReportCard({ summary }) {
  const total = summary.users.total
  const neverLoggedIn = summary.users.neverLoggedIn
  const recentlyLogged = Math.max(0, total - neverLoggedIn - summary.users.inactive90Days - summary.users.inactive180Days)
  const expiringSoon = summary.users.mustChangePassword
  const data = [
    { name: 'Users Never Logged On',      value: neverLoggedIn,    color: '#06b6d4' },
    { name: 'Recently Logged (30 days)',   value: recentlyLogged,  color: '#22c55e' },
    { name: 'Inactive Bad Logged (30d)',   value: summary.users.locked, color: '#ec4899' },
    { name: 'Password Expiring (7 days)',  value: expiringSoon,    color: '#3b82f6' },
  ]
  return (
    <Card title="Logged On User Report">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={180} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Groups and OU Reports
// ─────────────────────────────────────────────────────────
function GroupsAndOUsCard({ summary }) {
  const data = [
    { name: 'Number of groups',          value: summary.groups.total,         color: '#06b6d4' },
    { name: 'Number of security groups', value: summary.groups.security,      color: '#22c55e' },
    { name: 'Number of distribution',    value: summary.groups.distribution,  color: '#3b82f6' },
    { name: 'Groups without members',    value: summary.groups.empty,         color: '#a855f7' },
    { name: 'Number of OUs',            value: summary.ous.total,            color: '#f59e0b' },
  ]
  return (
    <Card title="Group and OU Reports">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={180} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (<Cell key={'cell-' + index} fill={entry.color} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Departments Chart
// ─────────────────────────────────────────────────────────
function DepartmentsChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const COLORS = ['#06b6d4', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#10b981', '#f97316', '#8b5cf6']

  useEffect(() => {
    getUsersByDepartment().then(d => {
      const top = (d.departments || []).slice(0, 8).map(dept => ({
        name: dept.department,
        value: dept.total
      }))
      setData(top)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <Card title="Users by Department (Top 8)">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">No data</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine={false}
                label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
                outerRadius={80} fill="#8884d8" dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// OS Chart
// ─────────────────────────────────────────────────────────
function OperatingSystemChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const COLORS = ['#06b6d4', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899']

  useEffect(() => {
    getComputersByOS().then(d => {
      const list = (d.operatingSystems || []).map(os => ({
        name: os.os || 'Unknown',
        value: os.total
      }))
      setData(list)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <Card title="Computers by Operating System">
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">No data</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" labelLine={false}
                label={({ name, percent }) => name.substring(0, 20) + ' ' + (percent * 100).toFixed(0) + '%'}
                outerRadius={80} fill="#8884d8" dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={'cell-' + index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Reusable Card
// ─────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
        <h2 className="font-semibold text-slate-200">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Legend Row
// ─────────────────────────────────────────────────────────
function LegendRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-700/30 rounded text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
        <span className="text-slate-300">{label}</span>
      </div>
      <span className="font-bold text-white">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Export Button
// ─────────────────────────────────────────────────────────
function ExportButton({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
    >
      <Download size={14} />
      {label}
    </button>
  )
}