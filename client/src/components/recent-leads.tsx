import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface RecentLeadsProps {
  user: any;
}

export default function RecentLeads({ user }: RecentLeadsProps) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/leads', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/leads?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

  const recentLeads = (leads as Lead[]).slice(-3).reverse();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-orange-100 text-orange-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recent Leads</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 py-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-6 bg-slate-200 rounded"></div>
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
          <h3 className="text-lg font-semibold text-slate-800">Recent Leads</h3>
          <a href="/leads" className="text-primary text-sm font-medium hover:text-primary/80">
            View All
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentLeads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500" data-testid="text-no-recent-leads">No recent leads</p>
            </div>
          ) : (
            recentLeads.map((lead: Lead) => (
              <div 
                key={lead.id} 
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
                data-testid={`lead-item-${lead.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-slate-100">
                      <User className="h-4 w-4 text-slate-500" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-800" data-testid={`text-lead-name-${lead.id}`}>
                      {lead.companyName}
                    </p>
                    <p className="text-sm text-slate-500" data-testid={`text-lead-company-${lead.id}`}>
                      {lead.clientPoc || 'No contact'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={`${getStatusColor(lead.status)} text-xs font-medium`}
                    data-testid={`badge-lead-status-${lead.id}`}
                  >
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1" data-testid={`text-lead-created-${lead.id}`}>
                    {lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : 'Recently added'}
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
