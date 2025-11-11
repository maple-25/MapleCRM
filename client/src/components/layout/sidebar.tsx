import { Link, useLocation } from "wouter";
import { useSidebar } from "@/contexts/SidebarContext";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  FolderOpen, 
  Handshake,
  Settings,
  BarChart3,
  Download,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const [location] = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return { totalLeads: 0, activeClients: 0, activeProjects: 0 };
      const response = await fetch(`/api/dashboard/stats?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return { totalLeads: 0, activeClients: 0, activeProjects: 0 };
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/leads', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/leads?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/clients?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/projects?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Filter projects to show only active ones (planning, in_progress, on_hold)
  const activeProjects = projects.filter((project: any) => 
    project.status === 'planning' || project.status === 'in_progress' || project.status === 'on_hold'
  );

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/leads", label: "Leads", icon: UserPlus, count: leads.length },
    { path: "/clients", label: "Clients", icon: Users, count: clients.length },
    { path: "/projects", label: "Projects", icon: FolderOpen, count: activeProjects.length },
    { path: "/partners", label: "Partners", icon: Handshake },
    { path: "/fund-tracker", label: "Fund Tracker", icon: BarChart3 },
    { path: "/client-master-data", label: "Client Master Data", icon: Database },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-sm border-r border-slate-200 fixed left-0 top-16 bottom-0 overflow-y-auto dark:bg-gray-900 dark:border-gray-700 transition-all duration-300 ease-in-out z-30 flex flex-col`}>
      
      <nav className={`space-y-2 ${isCollapsed ? 'p-2' : 'p-6'} flex-1`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} ${
                  isActive(item.path) 
                    ? "bg-navy-blue text-white hover:bg-navy-blue-dark font-medium" 
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                style={isActive(item.path) ? { 
                  backgroundColor: 'hsl(244, 84%, 32%)', 
                  color: 'white',
                  fontWeight: '500'
                } : {}}
                data-testid={`nav-${item.label.toLowerCase()}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <Badge 
                        variant={isActive(item.path) ? "secondary" : "outline"}
                        className={`ml-auto ${
                          isActive(item.path) 
                            ? "bg-white text-navy-blue font-medium" 
                            : "bg-maple-red-light text-maple-red"
                        }`}
                        style={isActive(item.path) ? {
                          backgroundColor: 'white',
                          color: 'hsl(244, 84%, 32%)',
                          fontWeight: '500'
                        } : {}}
                      >
                        {item.count}
                      </Badge>
                    )}
                  </>
                )}

              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Toggle Button at Bottom */}
      <div className="p-4 border-t border-slate-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          data-testid="sidebar-toggle"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
