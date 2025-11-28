import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useExport } from "@/hooks/useExport";
import { Search, Filter, Pencil, Trash2, Users, Download, Eye, MessageSquare, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

import ClientModal from "@/components/modals/client-modal";
import ClientComments from "@/components/client-comments";
import { Client } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useSidebar } from "@/contexts/SidebarContext";

interface ClientsProps {
  user: any;
  onLogout: () => void;
}

export default function Clients({ user, onLogout }: ClientsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportData, isExporting } = useExport();
  const { sidebarWidth } = useSidebar();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients', user.id],
    queryFn: () => apiRequest('GET', `/api/clients?userId=${user.id}&userRole=${user.role}`),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const { data: pastClients = [], isLoading: pastClientsLoading } = useQuery({
    queryKey: ['/api/clients/past', user.id],
    queryFn: () => apiRequest('GET', `/api/clients/past?userId=${user.id}&userRole=${user.role}`),
    staleTime: 60000, // Past clients change less frequently, 60 seconds
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId: string) => apiRequest('DELETE', `/api/clients/${clientId}`),
    onMutate: async (clientId) => {
      await queryClient.cancelQueries({ queryKey: ['/api/clients'] });
      const previousClients = queryClient.getQueryData(['/api/clients', user.id]);
      
      // Optimistically remove the client
      queryClient.setQueryData(['/api/clients', user.id], (old: any) => {
        if (!old) return old;
        return old.filter((c: any) => c.id !== clientId);
      });
      
      return { previousClients };
    },
    onSuccess: () => {
      // Invalidate without immediate refetch
      queryClient.invalidateQueries({ queryKey: ['/api/clients'], refetchType: 'none' });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/clients'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
      }, 0);
      toast({
        title: "Success",
        description: "Client deleted successfully!",
      });
    },
    onError: (error: any, _clientId, context: any) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['/api/clients', user.id], context.previousClients);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const filteredClients = (clients as Client[]).filter((client: Client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.companyName.toLowerCase().includes(searchLower) ||
      client.clientPoc.toLowerCase().includes(searchLower) ||
      client.emailId.toLowerCase().includes(searchLower) ||
      client.sector.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NDA Shared': 'bg-blue-100 text-blue-700 border-blue-200',
      'NDA Signed': 'bg-green-100 text-green-700 border-green-200',
      'IM/Financial Model': 'bg-purple-100 text-purple-700 border-purple-200',
      'Investor Tracker': 'bg-orange-100 text-orange-700 border-orange-200',
      'Term Sheet': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Due Diligence': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Agreement': 'bg-pink-100 text-pink-700 border-pink-200',
      'Transaction closed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Client Dropped': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <main className="flex-1 transition-all duration-300 ease-in-out overflow-auto p-6" style={{ marginLeft: `${sidebarWidth}px` }}>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2" data-testid="heading-clients">
                Clients Management
              </h2>
              <p className="text-slate-600">
                Manage your client relationships
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => exportData({ dataType: 'clients', format: 'xlsx', filename: 'clients_export.xlsx' })}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2"
                data-testid="button-export-clients"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
                data-testid="button-add-client"
              >
                <Users className="h-4 w-4" />
                Add New Client
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Clients ({filteredClients.length})</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search-clients"
                    />
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-filter-clients">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading clients...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No clients found. Convert leads to clients to see them here.
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white border-r border-slate-200 z-20 w-[250px] max-w-[250px]">Company</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone/Email</TableHead>
                        <TableHead>Last Contacted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Control Sheet</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Co-Lead</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client: Client, index: number) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium sticky left-0 bg-white border-r border-slate-200 z-20 w-[250px] max-w-[250px]" data-testid={`text-client-company-${index}`}>
                            <div className="text-sm">
                              <div className="font-semibold text-slate-800">{client.companyName}</div>
                              <div className="text-slate-500">
                                {client.sector === 'Others' ? client.customSector : client.sector}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-client-sector-${index}`}>
                            {client.sector === 'Others' ? client.customSector : client.sector}
                          </TableCell>
                          <TableCell data-testid={`text-client-transaction-${index}`}>
                            {client.transactionType === 'Others' ? client.customTransactionType : client.transactionType}
                          </TableCell>
                          <TableCell data-testid={`text-client-contact-${index}`}>
                            <div className="text-sm">
                              <div className="font-medium text-slate-700">{client.clientPoc}</div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-client-phone-email-${index}`}>
                            <div className="text-sm text-slate-600">
                              {client.phoneNumber && <div>{client.phoneNumber}</div>}
                              <div>{client.emailId}</div>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-client-last-contacted-${index}`}>
                            <div className="text-sm text-slate-500">
                              {client.lastContacted 
                                ? new Date(client.lastContacted).toLocaleDateString()
                                : "No contact date"
                              }
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-client-status-${index}`}>
                            <Badge 
                              className={`${getStatusColor(client.status)} text-xs font-medium`}
                            >
                              {client.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`button-control-sheet-${index}`}>
                            {client.controlSheetLink ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(client.controlSheetLink || '', '_blank')}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                                title="Open Control Sheet"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500" data-testid={`text-client-lead-${index}`}>
                            {client.leadAssignment || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500" data-testid={`text-client-co-lead-${index}`}>
                            {client.coLeadAssignment || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingClient(client)}
                                data-testid={`button-view-client-${client.id}`}
                                title="View Details & Comments"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingClient(client)}
                                data-testid={`button-edit-client-${client.id}`}
                                title="Edit Client"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-delete-client-${client.id}`}
                                    title="Delete Client"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{client.companyName}"? This action cannot be undone and will also remove any lead references to this client.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteClientMutation.mutate(client.id)}
                                      disabled={deleteClientMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
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

          {/* Past Clients Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
                <span>Past Clients</span>
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {pastClients.length} completed transactions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastClientsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : pastClients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No past clients found</p>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Control Sheet</TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Co-Lead</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastClients.map((client: Client, index: number) => (
                        <TableRow key={client.id} className="opacity-75">
                          <TableCell className="font-medium">
                            <div>
                              <span className="text-sm font-medium text-slate-900">
                                {client.companyName}
                              </span>
                              <br />
                              <span className="text-sm text-slate-500">
                                {client.clientPoc}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {client.sector === 'Others' ? client.customSector : client.sector}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {client.transactionType === 'Others' ? client.customTransactionType : client.transactionType}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-slate-900">{client.emailId}</div>
                              {client.phoneNumber && (
                                <div className="text-slate-500">{client.phoneNumber}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={`${
                                client.status === 'Client Dropped' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              } text-xs font-medium`}
                            >
                              {client.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.controlSheetLink ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(client.controlSheetLink || '', '_blank')}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                                title="Open Control Sheet"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {client.leadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">
                              {client.coLeadAssignment || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500">
                              {client.updatedAt ? formatDistanceToNow(new Date(client.updatedAt), { addSuffix: true }) : 'Unknown'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingClient(client)}
                                data-testid={`button-view-past-client-${client.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
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
      
      {/* Create New Client Modal */}
      <ClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        client={null}
        user={user}
      />
      
      {/* Edit Client Modal */}
      <ClientModal
        isOpen={editingClient !== null}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        user={user}
      />
      
      {/* Client Details Modal with Comments */}
      <Dialog open={viewingClient !== null} onOpenChange={() => setViewingClient(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {viewingClient?.companyName} - Client Details
            </DialogTitle>
          </DialogHeader>
          
          {viewingClient && (
            <div className="space-y-6">
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Company Name</label>
                      <p className="text-sm text-slate-900">{viewingClient.companyName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Sector</label>
                      <p className="text-sm text-slate-900">
                        {viewingClient.sector === 'Others' ? viewingClient.customSector : viewingClient.sector}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Transaction Type</label>
                      <p className="text-sm text-slate-900">
                        {viewingClient.transactionType === 'Others' ? viewingClient.customTransactionType : viewingClient.transactionType}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Status</label>
                      <Badge className={`${getStatusColor(viewingClient.status)} text-xs font-medium`}>
                        {viewingClient.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Contact Person</label>
                      <p className="text-sm text-slate-900">{viewingClient.clientPoc}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Email</label>
                      <p className="text-sm text-slate-900">{viewingClient.emailId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Phone</label>
                      <p className="text-sm text-slate-900">{viewingClient.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Created By</label>
                      <p className="text-sm text-slate-900">{viewingClient.assignedTo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Last Contacted</label>
                      <p className="text-sm text-slate-900">
                        {viewingClient.lastContacted 
                          ? new Date(viewingClient.lastContacted).toLocaleDateString()
                          : "No contact date"
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Created</label>
                      <p className="text-sm text-slate-900">
                        {viewingClient.createdAt ? formatDistanceToNow(new Date(viewingClient.createdAt), { addSuffix: true }) : 'No date'}
                      </p>
                    </div>
                  </div>
                  {viewingClient.notes && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-600">Notes</label>
                      <p className="text-sm text-slate-900 mt-1 p-3 bg-slate-50 rounded-lg">
                        {viewingClient.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Comments Section */}
              <ClientComments clientId={viewingClient.id} user={user} />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
