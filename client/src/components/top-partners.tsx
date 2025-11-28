import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Partner } from "@shared/schema";

export default function TopPartners() {
  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['/api/partners'],
  });

  const topPartners = partners.slice(0, 3);

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-slate-200">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-slate-800">Top Partners</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                    <div>
                      <div className="h-4 bg-slate-200 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="w-12 h-5 bg-slate-200 rounded"></div>
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
        <h3 className="text-lg font-semibold text-slate-800">Top Partners</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPartners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500" data-testid="text-no-partners">No partners found</p>
            </div>
          ) : (
            topPartners.map((partner: Partner) => (
              <div 
                key={partner.id} 
                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
                data-testid={`partner-item-${partner.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                    <Handshake className="text-slate-500 h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm" data-testid={`text-partner-name-${partner.id}`}>
                      {partner.name}
                    </p>
                    <p className="text-xs text-slate-500" data-testid={`text-partner-commission-${partner.id}`}>
                      {partner.commissionRate}% commission
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={partner.isActive === 'true' ? 'default' : 'secondary'}
                  className={partner.isActive === 'true' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                  data-testid={`badge-partner-status-${partner.id}`}
                >
                  {partner.isActive === 'true' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
