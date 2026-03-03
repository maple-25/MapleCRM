import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import { format } from "date-fns";

interface ActiveProjectsProps {
  user: any;
}

export default function ActiveProjects({ user }: ActiveProjectsProps) {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/projects?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/clients?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const activeProjects = projects
    .filter((project: Project) => project.status === 'planning' || project.status === 'in_progress')
    .slice(0, 3);

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'No Client Assigned';
    const client = (clients as any[]).find((c: any) => c.id === clientId);
    return client ? client.companyName : 'Unknown Client';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500';
      case 'in_progress': return 'bg-green-500';
      case 'on_hold': return 'bg-orange-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Active Projects</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 py-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-4 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Active Projects</h3>
          <a href="/projects" className="text-primary text-sm font-medium hover:text-primary/80">
            View All
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500" data-testid="text-no-active-projects">No active projects</p>
            </div>
          ) : (
            activeProjects.map((project: Project) => (
              <div 
                key={project.id} 
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
                data-testid={`project-item-${project.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getStatusColor(project.status)} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                    <FolderOpen className={`${getStatusColor(project.status).replace('bg-', 'text-')} h-4 w-4`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800" data-testid={`text-project-name-${project.id}`}>
                      {project.name}
                    </p>
                    <p className="text-sm text-slate-500" data-testid={`text-project-client-${project.id}`}>
                      {getClientName(project.clientId)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(project.status)}`} data-testid={`status-project-${project.id}`}>
                      {project.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500" data-testid={`text-project-due-${project.id}`}>
                    {project.dueDate ? `Due: ${format(new Date(project.dueDate), 'MMM dd')}` : 'No due date'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
