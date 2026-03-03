import { useQuery } from "@tanstack/react-query";
import { Clock, Users, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Client } from "@shared/schema";

interface RecentClientsProps {
  user: any;
}

export default function RecentClients({ user }: RecentClientsProps) {
  const { data: recentClients = [], isLoading } = useQuery({
    queryKey: ['/api/clients/recent', user.id],
    queryFn: () => apiRequest('GET', `/api/clients/recent?userId=${user.id}&userRole=${user.role}`),
    enabled: !!user?.id && !!user?.role,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NDA Shared': 'bg-blue-100 text-blue-700',
      'NDA Signed': 'bg-green-100 text-green-700',
      'IM/Financial Model': 'bg-purple-100 text-purple-700',
      'Investor Tracker': 'bg-orange-100 text-orange-700',
      'Term Sheet': 'bg-indigo-100 text-indigo-700',
      'Due Diligence': 'bg-yellow-100 text-yellow-700',
      'Agreement': 'bg-teal-100 text-teal-700',
      'Transaction closed': 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Recent Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-recent-clients">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <span>Recent Clients</span>
          </div>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <span className="text-sm">View All</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {recentClients.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm" data-testid="text-no-recent-clients">
              No recent clients found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(recentClients as Client[]).map((client, index) => (
              <div 
                key={client.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                data-testid={`item-recent-client-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 truncate" data-testid={`text-client-name-${index}`}>
                      {client.companyName}
                    </h4>
                    <Badge 
                      className={`${getStatusColor(client.status)} text-xs`}
                      data-testid={`badge-client-status-${index}`}
                    >
                      {client.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 truncate" data-testid={`text-client-poc-${index}`}>
                    {client.clientPoc}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500" data-testid={`text-client-time-${index}`}>
                      {client.createdAt ? formatDistanceToNow(new Date(client.createdAt), { addSuffix: true }) : 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {client.sector === 'Others' ? client.customSector : client.sector}
                    </p>
                    <p className="text-xs text-slate-500">
                      {client.transactionType === 'Others' ? client.customTransactionType : client.transactionType}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}