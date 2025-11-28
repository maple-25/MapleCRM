import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Check, UserPlus, Handshake, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity() {
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      // Get projects without user filtering for activity feed
      const response = await fetch('/api/projects?userId=all&userRole=admin');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Create activity feed from recent items
  const recentLeads = (leads as any[] || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2)
    .map(lead => ({
      id: `lead-${lead.id}`,
      description: `New lead "${lead.companyName}" added by ${lead.assignedTo}`,
      timestamp: lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : 'Recently',
      icon: UserPlus,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-600 bg-opacity-10',
    }));

  const recentClients = (clients as any[] || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 1)
    .map(client => ({
      id: `client-${client.id}`,
      description: `New client "${client.companyName}" added by ${client.assignedTo}`,
      timestamp: client.createdAt ? formatDistanceToNow(new Date(client.createdAt), { addSuffix: true }) : 'Recently',
      icon: Handshake,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-600 bg-opacity-10',
    }));

  const recentProjects = (projects as any[] || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 1)
    .map(project => ({
      id: `project-${project.id}`,
      description: `Project "${project.name}" created by ${project.ownerName || 'Unknown'}`,
      timestamp: project.createdAt ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true }) : 'Recently',
      icon: FolderOpen,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-600 bg-opacity-10',
    }));

  const activities = [...recentLeads, ...recentClients, ...recentProjects]
    .sort((a, b) => {
      // Sort by timestamp (most recent first)
      const aTime = a.timestamp.includes('ago') ? new Date(Date.now() - parseTimeAgo(a.timestamp)) : new Date();
      const bTime = b.timestamp.includes('ago') ? new Date(Date.now() - parseTimeAgo(b.timestamp)) : new Date();
      return bTime.getTime() - aTime.getTime();
    })
    .slice(0, 4);

  function parseTimeAgo(timeString: string): number {
    // Simple parser for "X minutes/hours/days ago"
    const match = timeString.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'minute': return value * 60 * 1000;
      case 'hour': return value * 60 * 60 * 1000;
      case 'day': return value * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div 
                key={activity.id} 
                className="flex items-start space-x-3 py-3 border-b border-slate-100 last:border-b-0"
                data-testid={`activity-item-${activity.id}`}
              >
                <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center mt-1`}>
                  <Icon className={`${activity.iconColor} h-4 w-4`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800" data-testid={`text-activity-description-${activity.id}`}>
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1" data-testid={`text-activity-timestamp-${activity.id}`}>
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
