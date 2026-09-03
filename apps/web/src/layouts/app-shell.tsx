import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bot,
  BriefcaseBusiness,
  CalendarCheck2,
  Columns3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { Logo } from '../components/logo';
import { useUiStore } from '../store/ui-store';

const navigation = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/resume', icon: FileText, label: '我的简历' },
  { to: '/jobs', icon: BriefcaseBusiness, label: '职位管理' },
  { to: '/applications', icon: Columns3, label: '投递看板' },
  { to: '/tasks', icon: CalendarCheck2, label: '准备计划' },
  { to: '/agent', icon: Bot, label: 'AI 助手' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUiStore();

  return (
    <div className="min-h-screen bg-cream">
      <aside
        className={`fixed z-30 inset-y-0 left-0 w-64 bg-white border-r border-line p-5 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between">
          <Logo />
          <button className="lg:hidden" onClick={toggleSidebar} aria-label="关闭导航">
            <X />
          </button>
        </div>
        <nav className="mt-10 space-y-1">
          {navigation.map(({ to, icon: Icon, label }) => (
            <NavLink
              end={to === '/'}
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-mint text-brand' : 'text-muted hover:bg-gray-50 hover:text-ink'}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3.5 py-3 text-sm text-muted"
          >
            <Settings size={18} />
            设置
          </NavLink>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              location.href = '/login';
            }}
            className="flex items-center gap-3 px-3.5 py-3 text-sm text-muted"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="lg:ml-64">
        <header className="h-16 border-b border-line bg-white/80 backdrop-blur flex items-center px-5 lg:px-8 sticky top-0 z-20">
          <button className="lg:hidden mr-3" onClick={toggleSidebar} aria-label="打开导航">
            <Menu />
          </button>
          <span className="text-sm text-muted">AI 求职工作台</span>
          <span className="ml-auto badge bg-mint text-brand">本地运行</span>
        </header>
        <div className="p-5 lg:p-8 max-w-[1500px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
