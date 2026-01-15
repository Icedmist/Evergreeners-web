import { Settings, Bell, Menu, Home, BarChart3, Flame, Target, Trophy } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn, triggerHaptic } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Flame, label: "Streaks", href: "/streaks" },
  { icon: Target, label: "Goals", href: "/goals" },
  { icon: Trophy, label: "Ranks", href: "/leaderboard" },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [notifications] = useState(3);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-0">
      <div className="glass-nav mt-4 rounded-2xl mx-auto max-w-5xl border border-primary/20 bg-primary/10">
        <div className="flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="Evergreeners"
              className="w-8 h-8 object-contain transition-transform group-hover:scale-110"
            />
            <span className="font-semibold text-foreground hidden sm:block">Forever Green</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => triggerHaptic()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium",
                    isActive
                      ? "border border-primary text-primary bg-transparent"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 relative"
              onClick={() => navigate('/profile')}
            >
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-slow">
                  {notifications}
                </span>
              )}
            </button>

            {/* Settings - desktop */}
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 hidden sm:flex"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Profile Avatar */}
            <Link
              to="/profile"
              className="ml-2 w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden hover:border-primary transition-colors"
            >
              <img
                src="https://avatars.githubusercontent.com/u/1?v=4"
                alt="User"
                className="w-full h-full object-cover"
              />
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}
