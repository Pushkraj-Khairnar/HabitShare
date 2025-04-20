
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home,
  Users,
  Trophy,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const links = [
    { 
      to: '/home',
      label: 'Home',
      icon: Home
    },
    { 
      to: '/friends',
      label: 'Friends',
      icon: Users
    },
    { 
      to: '/challenges',
      label: 'Challenges',
      icon: Trophy
    },
    { 
      to: '/settings',
      label: 'Settings',
      icon: Settings
    },
  ];
  
  return (
    <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <NavLink to="/home" className="flex items-center">
            <span className="text-xl font-bold text-habit-purple">HabitShare</span>
          </NavLink>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center text-sm font-medium transition-colors",
                  isActive 
                    ? "text-habit-purple" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <link.icon className="h-4 w-4 mr-2" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Mobile bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t md:hidden">
          <div className="grid grid-cols-4 py-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center py-1",
                    isActive 
                      ? "text-habit-purple" 
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <link.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{link.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
