import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  LayoutDashboard, User, Settings, Upload, Database, MessageSquare, 
  BarChart3, FileSpreadsheet, TrendingUp, Cpu, Bell, Search, 
  Menu, X, LogOut, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const activeRoute = (path: string) => location.pathname === path;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Files', path: '/upload', icon: Upload },
    { name: 'Documents Explorer', path: '/documents', icon: FileSpreadsheet },
    { name: 'Logical Datasets', path: '/datasets', icon: Database },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const futureMenuItems = [
    { name: 'AI Chat', icon: MessageSquare },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Reports', icon: FileSpreadsheet },
    { name: 'Forecasting', icon: TrendingUp },
    { name: 'Automation', icon: Cpu },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg font-mono">
              Ω
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              InsightNexus
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Core Platform</p>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeRoute(item.path)
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : 'hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modules (Coming Soon)</p>
            <ul className="space-y-1">
              {futureMenuItems.map((item) => (
                <li key={item.name} className="group relative">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/60 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4.5 w-4.5" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground/75 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      Soon
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-0 bottom-0 left-0 w-64 border-r border-border bg-card z-50 md:hidden flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg font-mono">
                    Ω
                  </div>
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                    InsightNexus
                  </span>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Core Platform</p>
                  <ul className="space-y-1">
                    {menuItems.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeRoute(item.path)
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <item.icon className="h-4.5 w-4.5" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modules (Coming Soon)</p>
                  <ul className="space-y-1">
                    {futureMenuItems.map((item) => (
                      <li key={item.name}>
                        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/60 cursor-not-allowed">
                          <div className="flex items-center gap-3">
                            <item.icon className="h-4.5 w-4.5" />
                            <span>{item.name}</span>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground/75">
                            Soon
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              <div className="p-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-200"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded md:hidden text-foreground hover:bg-secondary transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background max-w-xs w-60">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search metrics or reports..."
                className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground/70"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* Notification Bell (Placeholder) */}
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground relative hover:bg-secondary transition-colors" title="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 hover:bg-secondary p-1.5 rounded-lg transition-colors"
              >
                <img
                  src={user?.photoURL || 'https://lh3.googleusercontent.com/a/default-user'}
                  alt={user?.name || 'User'}
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
                <span className="hidden md:inline text-sm font-semibold">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-lg p-2 z-50"
                    >
                      <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-bold truncate">{user?.email}</p>
                        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          {user?.role}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-border pt-1">
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-secondary/35">
          {children}
        </main>

        {/* Footer */}
        <footer className="h-12 border-t border-border bg-card flex items-center justify-between px-4 md:px-6 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} InsightNexus. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/about" className="hover:underline">About</Link>
            <span>v1.0.0 Foundation</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
export default DashboardLayout;
