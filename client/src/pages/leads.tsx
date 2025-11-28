import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useExport } from "@/hooks/useExport";
import { Search, Filter, Pencil, UserPlus, Trash2, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Components
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

import LeadModal from "@/components/modals/lead-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Types
import { type Lead } from "@shared/schema";

interface LeadsPageProps {
  user: any;
  onLogout: () => void;
}

export default function LeadsPage({ user, onLogout }: LeadsPageProps) {
  const { sidebarWidth } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportData, isExporting } = useExport();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['/api/leads', user.id],
    queryFn: () => apiRequest('GET', `/api/leads?userId=${user.id}&userRole=${user.role}`),
    staleTime: 30000, // 30 seconds
  });

  const { data: coldLeads = [], isLoading: coldLeadsLoading } = useQuery({
    queryKey: ['/api/leads/cold', user.id],
    queryFn: () => apiRequest('GET', `/api/leads/cold?userId=${user.id}&userRole=${user.role}`),
    staleTime: 60000, // 60 seconds - cold leads change less frequently
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['/api/partners', user?.id],
    queryFn: () => apiRequest('GET', `/api/partners?userId=${user?.id}&userRole=${user?.role}`),
    enabled: !!user?.id && !!user?.role,
    staleTime: 300000, // 5 minutes - partners rarely change
  });

  const convertToClientMutation = useMutation({
    mutationFn: (leadId: string) => {
      return apiRequest('POST', `/api/leads/${leadId}/convert-to-client`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Lead copied to client successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert lead to client",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (leadId: string) => apiRequest('DELETE', `/api/leads/${leadId}`),
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/leads'] });
      const previousLeads = queryClient.getQueryData(['/api/leads', user.id]);
      
      // Optimistically remove the lead
      queryClient.setQueryData(['/api/leads', user.id], (old: any) => {
        if (!old) return old;
        return old.filter((l: any) => l.id !== leadId);
      });
      
      return { previousLeads };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], refetchType: 'none' });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/leads'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
      }, 0);
      toast({
        title: "Success",
        description: "Lead deleted successfully!",
      });
    },
    onError: (error: any, _leadId, context: any) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['/api/leads', user.id], context.previousLeads);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const filteredLeads = (leads as Lead[]).filter((lead: Lead) => {
    const searchString = `${lead.companyName} ${lead.clientPoc} ${lead.emailId}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Initial Discussion':
        return 'bg-blue-100 text-blue-800';
      case 'NDA':
        return 'bg-yellow-100 text-yellow-800';
      case 'Engagement':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAcceptanceStageColor = (stage: string) => {
    switch (stage) {
      case 'Undecided':
        return 'bg-gray-100 text-gray-800';
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto p-6 transition-all duration-300 ease-in-out" style={{ marginLeft: `${sidebarWidth}px` }}>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2" data-testid="heading-leads">
                Leads Management
              </h2>
              <p className="text-slate-600">
                Track and manage your business leads with detailed information
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => exportData({ dataType: 'leads', format: 'xlsx', filename: 'leads_export.xlsx' })}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2"
                data-testid="button-export-leads"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
                data-testid="button-add-lead"
              >
                <UserPlus className="h-4 w-4" />
                Add New Lead
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Leads ({filteredLeads.length})</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search leads..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-leads"
                    />
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-filter-leads">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500" data-testid="text-no-leads">
                    {searchTerm ? 'No leads found matching your search' : 'No leads found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white border-r border-slate-200 z-20 w-[250px] max-w-[250px]">Company / POC</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Co-Lead</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead: Lead, index) => (
                        <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                          <TableCell className="font-medium sticky left-0 bg-white border-r border-slate-200 z-20 w-[250px] max-w-[250px]">
                            <div>
                              <span className="text-sm font-medium text-slate-900" data-testid={`text-lead-company-${index}`}>
                                {lead.companyName}
                              </span>
                              <br />
                              <span className="text-sm text-slate-500" data-testid={`text-lead-poc-${index}`}>
                                {lead.clientPoc}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded" data-testid={`text-lead-sector-${index}`}>
                              {lead.sector === 'Others' ? lead.customSector : lead.sector}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded" data-testid={`text-lead-transaction-${index}`}>
                              {lead.transactionType === 'Others' ? lead.customTransactionType : lead.transactionType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-900" data-testid={`text-lead-email-${index}`}>
                                {lead.emailId}
                              </div>
                              {lead.phoneNumber && (
                                <div className="text-slate-500" data-testid={`text-lead-phone-${index}`}>
                                  {lead.phoneNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-700">
                                {lead.sourceType}
                              </div>
                              <div className="text-slate-500">
                                {lead.sourceType === 'Inbound' 
                                  ? (lead.inboundSource === 'Others' ? lead.customInboundSource : lead.inboundSource)
                                  : lead.outboundSource
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary" className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                              <Badge variant="outline" className={getAcceptanceStageColor(lead.acceptanceStage)}>
                                {lead.acceptanceStage}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {lead.leadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {lead.coLeadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingLead(lead)}
                                data-testid={`button-edit-lead-${lead.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertToClientMutation.mutate(lead.id)}
                                disabled={convertToClientMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:border-green-300"
                                data-testid={`button-convert-lead-${lead.id}`}
                              >
                                {convertToClientMutation.isPending ? "Converting..." : "Copy to Client"}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                                    data-testid={`button-delete-lead-${lead.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{lead.companyName}"? This action cannot be undone and will also delete any associated client if this lead was converted.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteLeadMutation.mutate(lead.id)}
                                      disabled={deleteLeadMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleteLeadMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dormant Leads Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
                <span>Dormant Leads</span>
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {coldLeads.length} rejected leads
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coldLeadsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : coldLeads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No dormant leads found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company / POC</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Co-Lead</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coldLeads.map((lead: Lead, index: number) => (
                        <TableRow key={lead.id} className="opacity-75">
                          <TableCell className="font-medium">
                            <div>
                              <span className="text-sm font-medium text-slate-900">
                                {lead.companyName}
                              </span>
                              <br />
                              <span className="text-sm text-slate-500">
                                {lead.clientPoc}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {lead.sector === 'Others' ? lead.customSector : lead.sector}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {lead.transactionType === 'Others' ? lead.customTransactionType : lead.transactionType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-900">{lead.emailId}</div>
                              {lead.phoneNumber && (
                                <div className="text-slate-500">{lead.phoneNumber}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-700">{lead.sourceType}</div>
                              <div className="text-slate-500">
                                {lead.sourceType === 'Inbound' 
                                  ? (lead.inboundSource === 'Others' ? lead.customInboundSource : lead.inboundSource)
                                  : lead.outboundSource
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {lead.leadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {lead.coLeadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingLead(lead)}
                                data-testid={`button-edit-dormant-lead-${lead.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      
      {/* Create New Lead Modal */}
      <LeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        lead={null}
        user={user}
      />
      
      {/* Edit Lead Modal */}
      <LeadModal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        lead={editingLead}
        user={user}
      />
    </div>
  );
}