import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Camera, 
  ImagePlus,
  Image as ImageIcon,
  Grid, 
  Layers, 
  ZoomIn, 
  ListTree, 
  Archive, 
  Settings,
  Home,
  Crown,
  Menu,
  X,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext";

const navItems = [
  { icon: Home, label: "返回主页", path: "/" },
  { icon: Camera, label: "极简出片", path: "/app" },
  { icon: ImagePlus, label: "场景套图", path: "/app/multiview" },
  { icon: ImageIcon, label: "风格迁移", path: "/app/style-transfer" },
  { icon: Layers, label: "智能详情页", path: "/app/layout" },
  { icon: ListTree, label: "批量流水线", path: "/app/batch" },
  { icon: Archive, label: "数字资产库", path: "/app/assets" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, logout } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F0F0F] border-b border-[#ffffff10] z-40 flex items-center justify-between px-4">
        <Link to="/" className="text-sm tracking-widest uppercase flex items-center gap-2 serif font-bold">
          <div className="w-6 h-6 rounded-sm bg-[#C8855F] flex items-center justify-center font-bold text-black font-sans text-xs">
            Z
          </div>
          <span className="flex items-center">
            Zisha<span className="text-[#C8855F]">.AI</span>
          </span>
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-400 hover:text-white p-1 transition-colors">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "w-64 flex flex-col border-r border-[#ffffff10] bg-[#0F0F0F] shrink-0 font-sans h-[100dvh]",
        "fixed md:sticky top-0 left-0 z-50 transition-transform duration-300 shadow-2xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
      <div className="h-20 flex items-center px-6 border-b border-[#ffffff10]">
        <Link to="/" className="text-xl tracking-widest uppercase flex items-center gap-3 serif font-bold hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-sm bg-[#C8855F] flex items-center justify-center font-bold text-black font-sans">
            Z
          </div>
          <span className="flex items-center">
            Zisha<span className="text-[#C8855F]">.AI</span>
          </span>
          <span className="text-[10px] border border-stone-600 px-1 text-stone-400 font-sans rounded-sm ml-1 flex-shrink-0">
            V2.1 专业版
          </span>
        </Link>
      </div>
      
      <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
        <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-mono">
          工作区
        </p>
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app' || item.path === '/'}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-300 z-10",
                isActive ? "text-[#E5E7EB]" : "text-zinc-400 hover:text-[#E5E7EB] hover:bg-[#ffffff05]"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="sidebarActive" 
                    className="absolute inset-0 bg-[#161616] border border-[#ffffff10] rounded-lg -z-10 shadow-sm shadow-black"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "opacity-100 text-[#C8855F]" : "opacity-70")} />
                <span className={cn("font-light tracking-wide transition-all", isActive ? "font-medium" : "")}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        
        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
          <NavLink
            to="/app/pricing"
            className={({ isActive }) =>
              cn(
                "relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors duration-300 z-10",
                isActive ? "text-[#E5E7EB] bg-[#C8855F]/10 border-[#C8855F]/30 border" : "text-[#C8855F] hover:text-[#E5E7EB] hover:bg-[#ffffff05] border border-transparent"
              )
            }
          >
            <div className="flex items-center gap-3">
              <Crown className="w-4 h-4 opacity-80" />
              <span className="font-light tracking-wide">算力与订阅</span>
            </div>
          </NavLink>
        </div>

        {profile?.role === 'admin' && (
          <div className="mt-2 space-y-2">
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                cn(
                  "relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors duration-300 z-10",
                  isActive ? "text-[#E5E7EB] bg-red-500/10 border-red-500/30 border" : "text-red-500 hover:text-[#E5E7EB] hover:bg-[#ffffff05] border border-transparent"
                )
              }
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 opacity-80" />
                <span className="font-light tracking-wide">管理后台</span>
              </div>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-[#ffffff10]">
        {!user ? (
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-zinc-400 hover:text-[#E5E7EB] hover:bg-[#ffffff05] transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 shrink-0 group-hover:border-[#C8855F] transition-colors flex items-center justify-center text-[10px] text-white">
              U
            </div>
            <div className="text-left flex-1 overflow-hidden">
              <p className="truncate text-xs text-zinc-300 group-hover:text-white transition-colors">登录您的账号</p>
              <p className="truncate text-[10px] text-[#C8855F]">未登录</p>
            </div>
            <Settings className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity group-hover:rotate-90 duration-500" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-zinc-400 transition-colors group">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-[#C8855F] shrink-0 text-[#C8855F] flex items-center justify-center text-[10px]">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left flex-1 overflow-hidden">
              <p className="truncate text-xs text-zinc-300">{user.email || user.phoneNumber}</p>
              <p className="truncate text-[10px] text-[#C8855F]">积分: {profile?.points || 0}</p>
            </div>
            <button title="退出登录" onClick={() => logout()} className="hover:text-white transition-colors">
               <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
