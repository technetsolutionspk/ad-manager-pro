import { useState, useEffect } from 'react'
import {
  Save, TestTube, CheckCircle, XCircle, Database, Eye, EyeOff,
  Mail, Lock, Bell, Users as UsersIcon, Server, Settings as SettingsIcon,
  AlertCircle, Send, RefreshCw, ToggleLeft, ToggleRight, EyeOff as Hide
} from 'lucide-react'
import {
  getSettings, updateSettings, testConnection, sendTestEmail
} from '../api'

export default function Settings() {
  const [settings, setSettings]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [message, setMessage]     = useState(null)
  const [connected, setConnected] = useState(null)
  const [showPwd, setShowPwd]     = useState(false)
  const [showSmtpPwd, setShowSmtpPwd] = useState(false)
  const [activeTab, setActiveTab] = useState('ad')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to load settings')
    }
    setLoading(false)
  }

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setConnected(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      showMsg('success', '✓ Settings saved successfully!')
      await load()
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setConnected(null)
    try {
      const result = await testConnection(settings)
      setConnected(true)
      showMsg('success', `✓ ${result.message}`)
    } catch (err) {
      setConnected(false)
      showMsg('error', err.response?.data?.detail || 'Connection failed')
    }
    setTesting(false)
  }

  const handleTestEmail = async () => {
    const to = settings.notify_admin_email
    if (!to) {
      showMsg('error', 'Set "Admin Email" first')
      return
    }
    try {
      await sendTestEmail(to)
      showMsg('success', `✓ Test email sent to ${to}`)
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Email test failed')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-500 py-16">
          <RefreshCw size={48} className="mx-auto mb-3 animate-spin" />
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* ── Header ──────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <SettingsIcon size={28} className="text-slate-400" />
            Settings
          </h1>
          <p className="text-slate-400">Configure AD Manager Pro</p>
        </div>
        {connected !== null && (
          <span className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 ${
            connected
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {connected ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {connected ? 'Connected' : 'Connection Failed'}
          </span>
        )}
      </div>

      {/* ── Message ─────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────── */}
      <div className="mb-6 flex gap-1 border-b border-slate-700 overflow-x-auto">
        <TabButton active={activeTab === 'ad'} onClick={() => setActiveTab('ad')}
                   icon={Database} label="Active Directory" />
        <TabButton active={activeTab === 'visibility'} onClick={() => setActiveTab('visibility')}
                   icon={Eye} label="Visibility" badge="NEW" />
        <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}
                   icon={Lock} label="Password Policy" />
        <TabButton active={activeTab === 'email'} onClick={() => setActiveTab('email')}
                   icon={Mail} label="Email" />
      </div>

      {/* ═══ Active Directory Tab ═══ */}
      {activeTab === 'ad' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Database size={20} className="text-blue-400" />
            Active Directory Connection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Primary DC IP / Hostname"
              value={settings.ad_server_primary}
              onChange={v => handleChange('ad_server_primary', v)}
              placeholder="192.168.100.10"
              required
            />
            <Field
              label="Secondary DC (failover)"
              value={settings.ad_server_secondary}
              onChange={v => handleChange('ad_server_secondary', v)}
              placeholder="Optional"
            />
            <Field
              label="Domain Name"
              value={settings.ad_domain}
              onChange={v => handleChange('ad_domain', v)}
              placeholder="company.local"
              required
            />
            <Field
              label="Service Account (UPN)"
              value={settings.ad_service_account}
              onChange={v => handleChange('ad_service_account', v)}
              placeholder="svc-admanager@company.local"
              required
            />
            <Field
              label="Base DN"
              value={settings.ad_base_dn}
              onChange={v => handleChange('ad_base_dn', v)}
              placeholder="DC=company,DC=local"
              fullWidth
              required
            />
            <Field
              label="Default User OU"
              value={settings.ad_default_user_ou}
              onChange={v => handleChange('ad_default_user_ou', v)}
              placeholder="OU=Users,DC=company,DC=local"
              fullWidth
            />

            {/* Password with show/hide */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Service Account Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={settings.ad_service_password || ''}
                  onChange={(e) => handleChange('ad_service_password', e.target.value)}
                  placeholder="Leave masked to keep current"
                  className="w-full px-4 py-2.5 pr-12 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Protocol</label>
              <div className="flex gap-4 py-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={settings.ad_use_ldaps === 'true'}
                    onChange={() => {
                      handleChange('ad_use_ldaps', 'true')
                      handleChange('ad_port', '636')
                    }}
                  />
                  <span className="text-sm">🔒 LDAPS (636) - Encrypted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={settings.ad_use_ldaps === 'false'}
                    onChange={() => {
                      handleChange('ad_use_ldaps', 'false')
                      handleChange('ad_port', '389')
                    }}
                  />
                  <span className="text-sm">LDAP (389) - Plain</span>
                </label>
              </div>
            </div>

            <Field
              label="Port"
              type="number"
              value={settings.ad_port}
              onChange={v => handleChange('ad_port', v)}
            />
          </div>

          <div className="mt-6 flex gap-3 justify-end pt-6 border-t border-slate-700">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <TestTube size={16} />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Visibility Tab (NEW) ═══ */}
      {activeTab === 'visibility' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Eye size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-blue-300 mb-1">Hide Built-in AD Objects</h3>
                <p className="text-sm text-slate-300">
                  By default, built-in Windows accounts (Administrator, Guest, krbtgt) and
                  built-in groups (Domain Admins, Domain Users, etc.) are hidden from the lists.
                  Enable these toggles to show them.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <Eye size={20} className="text-cyan-400" />
              Built-in Object Visibility
            </h2>

            <div className="space-y-3">
              <ToggleRow
                label="Show Built-in Users"
                description="Display Administrator, Guest, krbtgt, etc. in user lists"
                value={settings.show_builtin_users === 'true'}
                onChange={(v) => handleChange('show_builtin_users', v ? 'true' : 'false')}
                examples={['Administrator', 'Guest', 'krbtgt', 'DefaultAccount']}
              />

              <ToggleRow
                label="Show Built-in Groups"
                description="Display Domain Admins, Domain Users, Schema Admins, etc."
                value={settings.show_builtin_groups === 'true'}
                onChange={(v) => handleChange('show_builtin_groups', v ? 'true' : 'false')}
                examples={['Domain Admins', 'Domain Users', 'Enterprise Admins', 'Schema Admins']}
              />

              <ToggleRow
                label="Show Built-in Containers"
                description="Display objects from CN=Users, CN=Builtin, CN=Computers, etc."
                value={settings.show_builtin_containers === 'true'}
                onChange={(v) => handleChange('show_builtin_containers', v ? 'true' : 'false')}
                examples={['CN=Users', 'CN=Builtin', 'CN=Computers', 'CN=System']}
              />
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Recommendation:</strong> Keep these hidden in production to focus on your
                  managed users/groups and avoid accidentally modifying critical system accounts.
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end pt-6 border-t border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Visibility Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Password Policy Tab ═══ */}
      {activeTab === 'password' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Lock size={20} className="text-yellow-400" />
            Password Policy Display
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            These settings are for display purposes only. Actual password policy is enforced by your Domain Controller.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Minimum Length"
              type="number"
              value={settings.pwd_min_length}
              onChange={v => handleChange('pwd_min_length', v)}
            />
            <Field
              label="Max Password Age (days)"
              type="number"
              value={settings.pwd_max_age_days}
              onChange={v => handleChange('pwd_max_age_days', v)}
            />
            <Field
              label="Password History Count"
              type="number"
              value={settings.pwd_history_count}
              onChange={v => handleChange('pwd_history_count', v)}
              fullWidth
            />

            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <CheckboxRow
                label="Require Uppercase Letter"
                value={settings.pwd_require_upper === 'true'}
                onChange={(v) => handleChange('pwd_require_upper', v ? 'true' : 'false')}
              />
              <CheckboxRow
                label="Require Lowercase Letter"
                value={settings.pwd_require_lower === 'true'}
                onChange={(v) => handleChange('pwd_require_lower', v ? 'true' : 'false')}
              />
              <CheckboxRow
                label="Require Number"
                value={settings.pwd_require_number === 'true'}
                onChange={(v) => handleChange('pwd_require_number', v ? 'true' : 'false')}
              />
              <CheckboxRow
                label="Require Special Character"
                value={settings.pwd_require_special === 'true'}
                onChange={(v) => handleChange('pwd_require_special', v ? 'true' : 'false')}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end pt-6 border-t border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Password Policy'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Email Notifications Tab ═══ */}
      {activeTab === 'email' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Mail size={20} className="text-green-400" />
            Email / SMTP Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="SMTP Server"
              value={settings.notify_smtp_server}
              onChange={v => handleChange('notify_smtp_server', v)}
              placeholder="smtp.gmail.com"
            />
            <Field
              label="SMTP Port"
              type="number"
              value={settings.notify_smtp_port}
              onChange={v => handleChange('notify_smtp_port', v)}
              placeholder="587"
            />
            <Field
              label="SMTP Username"
              value={settings.notify_smtp_user}
              onChange={v => handleChange('notify_smtp_user', v)}
              placeholder="notify@company.com"
            />

            <div>
              <label className="block text-sm text-slate-400 mb-2">SMTP Password</label>
              <div className="relative">
                <input
                  type={showSmtpPwd ? 'text' : 'password'}
                  value={settings.notify_smtp_password || ''}
                  onChange={(e) => handleChange('notify_smtp_password', e.target.value)}
                  placeholder="Leave masked to keep current"
                  className="w-full px-4 py-2.5 pr-12 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button type="button" onClick={() => setShowSmtpPwd(!showSmtpPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  {showSmtpPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Field
              label="From Email"
              type="email"
              value={settings.notify_from_email}
              onChange={v => handleChange('notify_from_email', v)}
              placeholder="noreply@company.com"
            />
            <Field
              label="Admin Email (for test/alerts)"
              type="email"
              value={settings.notify_admin_email}
              onChange={v => handleChange('notify_admin_email', v)}
              placeholder="admin@company.com"
            />
          </div>

          <div className="mt-6 space-y-3 pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Notification Options
            </h3>
            <CheckboxRow
              label="Notify on Account Lockout"
              value={settings.notify_on_lockout === 'true'}
              onChange={(v) => handleChange('notify_on_lockout', v ? 'true' : 'false')}
            />
            <CheckboxRow
              label="Notify on Password Expiry"
              value={settings.notify_on_password_expiry === 'true'}
              onChange={(v) => handleChange('notify_on_password_expiry', v ? 'true' : 'false')}
            />
          </div>

          <div className="mt-6 flex gap-3 justify-end pt-6 border-t border-slate-700">
            <button
              onClick={handleTestEmail}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
            >
              <Send size={16} />
              Send Test Email
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'border-blue-500 text-blue-400'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon size={16} />
      {label}
      {badge && (
        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded font-bold">
          {badge}
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// Field Input
// ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder = '', fullWidth = false, required = false }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm text-slate-400 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Checkbox Row
// ─────────────────────────────────────────────────────────
function CheckboxRow({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700/50">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

// ─────────────────────────────────────────────────────────
// Toggle Row (with examples)
// ─────────────────────────────────────────────────────────
function ToggleRow({ label, description, value, onChange, examples }) {
  return (
    <div className={`p-4 rounded-lg border transition cursor-pointer ${
      value
        ? 'bg-cyan-500/10 border-cyan-500/30'
        : 'bg-slate-900 border-slate-700 hover:border-slate-600'
    }`}
    onClick={() => onChange(!value)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">{label}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              value
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {value ? 'SHOWING' : 'HIDDEN'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-2">{description}</p>
          {examples && examples.length > 0 && (
            <div className="text-xs text-slate-500">
              Examples: {examples.map((e, i) => (
                <span key={i}>
                  <code className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-300">{e}</code>
                  {i < examples.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onChange(!value) }}
          className="flex-shrink-0"
        >
          {value
            ? <ToggleRight size={36} className="text-cyan-400" />
            : <ToggleLeft size={36} className="text-slate-500" />}
        </button>
      </div>
    </div>
  )
}