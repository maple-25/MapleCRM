import { Bell, ChevronDown, LogOut } from "lucide-react";
import mapleLogoPath from "@assets/Maple Capital Advisors Logo_1754465949469.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user?: any;
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 fixed top-0 left-0 right-0 z-40 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src={mapleLogoPath} 
            alt="Maple Capital Advisors" 
            className="h-8 w-auto"
            data-testid="maple-logo"
          />
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            data-testid="button-notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-navy-blue text-white text-sm font-medium">
                {user ? `${user.firstName?.[0] || 'J'}${user.lastName?.[0] || 'D'}` : 'JD'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-semibold text-black">
                {user ? `${user.firstName || 'John'} ${user.lastName || 'Doe'}` : 'John Doe'}
              </span>
              <span className="text-xs text-gray-700 uppercase">
                {user ? user.role || 'Admin' : 'Admin'}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1">
                <ChevronDown className="text-slate-400 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
