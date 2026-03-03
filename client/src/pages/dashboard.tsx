import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users, FolderOpen, DollarSign } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import FloatingActionButton from "@/components/floating-action-button";
import { useSidebar } from "@/contexts/SidebarContext";
import StatsCard from "@/components/stats-card";
import RecentLeads from "@/components/recent-leads";
import ActiveProjects from "@/components/active-projects";
import RecentClients from "@/components/recent-clients";


interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const { sidebarWidth } = useSidebar();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return { totalLeads: 0, activeClients: 0, activeProjects: 0 };
      const response = await fetch(`/api/dashboard/stats?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) {
        console.warn('Failed to fetch dashboard stats, using defaults');
        return { totalLeads: 0, activeClients: 0, activeProjects: 0 };
      }
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  // Type-safe stats access
  const safeStats = stats as { totalLeads?: number; activeClients?: number; activeProjects?: number } || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto p-6 transition-all duration-300 ease-in-out" style={{ marginLeft: `${sidebarWidth}px` }}>
          {/* Dashboard Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2" data-testid="heading-dashboard">
              Dashboard Overview
            </h2>
            <p className="text-slate-600">
              Welcome back, {user?.firstName || 'John'}! Here's what's happening with your business today.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-slate-200 rounded w-16"></div>
                    </div>
                    <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-24 mt-4"></div>
                </div>
              ))
            ) : (
              <>
                <StatsCard
                  title="Total Leads"
                  value={safeStats.totalLeads || 0}
                  change="+12%"
                  isPositive={true}
                  icon={UserPlus}
                  iconColor="text-orange-600"
                  iconBgColor="bg-orange-100"
                />
                <StatsCard
                  title="Total Clients"
                  value={safeStats.activeClients || 0}
                  change="+8%"
                  isPositive={true}
                  icon={Users}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                />
                <StatsCard
                  title="Active Projects"
                  value={safeStats.activeProjects || 0}
                  change="+25%"
                  isPositive={true}
                  icon={FolderOpen}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-100"
                />

              </>
            )}
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentLeads user={user} />
            <RecentClients user={user} />
            <ActiveProjects user={user} />
          </div>


        </main>
      </div>
      <FloatingActionButton user={user} />
    </div>
  );
}
