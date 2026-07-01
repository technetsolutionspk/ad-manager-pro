import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Shield, Monitor, FolderTree,
  ScrollText, Settings, LogOut, Server, ChevronLeft, ChevronRight,
  BarChart3, FileText, GitBranch, Bell, Camera, Activity,
  ShieldCheck, Cog
} from 'lucide-react'
import { getWorkflowRequests, getActiveSessions, logout as apiLogout } from '../api'

export default function Layout() {
  const [collapsed, setCollapsed]       = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [sessionsCount, setSessionsCount] = useState(0)
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin  = user.role === 'Admin'

  // ── Load badge counts ──
  useEffect(() => {
    loadBadges()
    const interval = setInterval(loadBadges, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadBadges = async () => {
    try {
      const data = await getWorkflowRequests('pending')
      setPendingCount(data.count || 0)
    } catch {
      setPendingCount(0)
    }

    if (isAdmin) {
      try {
        const data = await getActiveSessions()
        setSessionsCount(data.count || 0)
      } catch {
        setSessionsCount(0)
      }
    }
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // ── Menu Items ──
  const menu = [
    { to: '/',                 icon: LayoutDashboard, label: 'Dashboard'        },
    { to: '/users',            icon: Users,           label: 'Users'            },
    { to: '/groups',           icon: Shield,          label: 'Groups'           },
    { to: '/computers',        icon: Monitor,         label: 'Computers'        },
    { to: '/ous',              icon: FolderTree,      label: 'OUs'              },
    { to: '/service-accounts', icon: Cog,             label: 'Service Accounts' },
    { to: '/gpo',              icon: ShieldCheck,     label: 'GPOs'             },
    { to: '/photos',           icon: Camera,          label: 'User Photos'      },
    { to: '/templates',        icon: FileText,        label: 'Templates'        },
    { to: '/workflows',        icon: GitBranch,       label: 'Workflows',          badge: pendingCount },
    { to: '/sessions',         icon: Activity,        label: 'Sessions',           badge: sessionsCount, adminOnly: true },
    { to: '/reports',          icon: BarChart3,       label: 'Reports'          },
    { to: '/audit',            icon: ScrollText,      label: 'Audit Logs'       },
    { to: '/settings',         icon: Settings,        label: 'Settings',           adminOnly: true },
  ]

  // Filter menu based on role
  const visibleMenu = menu.filter(item => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-200`}>
        
        {/* Logo Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Server size={18} />
              </div>
              <div>
                <div className="font-bold text-sm">AD Manager Pro</div>
                <div className="text-xs text-slate-400">v2.2</div>
              </div>
            </div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="p-1 hover:bg-slate-700 rounded transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition group relative ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
              title={collapsed ? item.label : ''}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className={`px-2 py-0.5 text-white text-xs rounded-full font-bold ${
                      item.to === '/workflows' ? 'bg-orange-500' :
                      item.to === '/sessions'  ? 'bg-green-500'  :
                      'bg-red-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge > 0 && (
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  item.to === '/workflows' ? 'bg-orange-500' :
                  item.to === '/sessions'  ? 'bg-green-500'  :
                  'bg-red-500'
                }`}></span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-700">
          {!collapsed && (
            <div className="mb-3 px-3 py-2 bg-slate-900 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium truncate flex-1">
                  {user.display_name || user.username || 'User'}
                </div>
                {pendingCount > 0 && isAdmin && (
                  <button
                    onClick={() => navigate('/workflows')}
                    className="ml-2 p-1 hover:bg-slate-700 rounded text-yellow-400 relative"
                    title={`${pendingCount} pending approval${pendingCount !== 1 ? 's' : ''}`}
                  >
                    <Bell size={14} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  user.role === 'Admin' ? 'bg-red-400' :
                  user.role === 'Helpdesk' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`}></span>
                {user.role || 'Viewer'} • {user.username || ''}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition"
            title={collapsed ? 'Sign Out' : ''}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}