import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: any;
  user: any;
}

export default function ClientModal({ isOpen, onClose, client, user }: ClientModalProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    sector: "",
    customSector: "",
    transactionType: "",
    customTransactionType: "",
    clientPoc: "",
    phoneNumber: "",
    emailId: "",
    lastContacted: "",
    status: "NDA Shared",
    assignedTo: "",
    leadAssignment: "",
    coLeadAssignment: "",
    controlSheetLink: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active team members for Lead/Co-Lead dropdowns
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ['/api/team-members/active'],
  });

  // Update form data when client prop changes
  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName || "",
        sector: client.sector || "",
        customSector: client.customSector || "",
        transactionType: client.transactionType || "",
        customTransactionType: client.customTransactionType || "",
        clientPoc: client.clientPoc || "",
        phoneNumber: client.phoneNumber || "",
        emailId: client.emailId || "",
        lastContacted: client.lastContacted ? new Date(client.lastContacted).toISOString().split('T')[0] : "",
        status: client.status || "NDA Shared",
        assignedTo: client.assignedTo || "",
        leadAssignment: client.leadAssignment || "",
        coLeadAssignment: client.coLeadAssignment || "",
        controlSheetLink: client.controlSheetLink || "",
        notes: client.notes || "",
      });
    } else {
      // Reset form for new client
      setFormData({
        companyName: "",
        sector: "",
        customSector: "",
        transactionType: "",
        customTransactionType: "",
        clientPoc: "",
        phoneNumber: "",
        emailId: "",
        lastContacted: "",
        status: "NDA Shared",
        assignedTo: "",
        leadAssignment: "",
        coLeadAssignment: "",
        controlSheetLink: "",
        notes: "",
      });
    }
  }, [client]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const submitData = {
        ...data,
        lastContacted: data.lastContacted ? new Date(data.lastContacted) : null,
        ...(client ? {} : { 
          ownerId: user.id,
          assignedTo: user.name || user.username || user.email // Auto-assign to creator
        }),
      };
      
      if (client) {
        return apiRequest('PATCH', `/api/clients/${client.id}`, submitData);
      } else {
        return apiRequest('POST', '/api/clients', submitData);
      }
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/clients'] });
      
      // Snapshot previous value
      const previousClients = queryClient.getQueryData(['/api/clients', user.id]);
      
      // Optimistically update to the new value
      if (client) {
        queryClient.setQueryData(['/api/clients', user.id], (old: any) => {
          if (!old) return old;
          return old.map((c: any) => c.id === client.id ? { ...c, ...data, updatedAt: new Date() } : c);
        });
      }
      
      return { previousClients };
    },
    onSuccess: () => {
      // Only invalidate specific queries without waiting
      queryClient.invalidateQueries({ queryKey: ['/api/clients'], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['/api/clients/past'], refetchType: 'none' });
      // Refetch in background
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/clients'] });
        queryClient.refetchQueries({ queryKey: ['/api/clients/past'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
      }, 0);
      toast({
        title: "Success",
        description: client ? "Client updated successfully!" : "Client created successfully!",
      });
      onClose();
    },
    onError: (error: any, _data, context: any) => {
      // Rollback on error
      if (context?.previousClients) {
        queryClient.setQueryData(['/api/clients', user.id], context.previousClients);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save client",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.companyName || !formData.sector || !formData.transactionType || 
        !formData.clientPoc || !formData.emailId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate custom fields
    if (formData.sector === "Others" && !formData.customSector) {
      toast({
        title: "Validation Error",
        description: "Please specify the custom sector",
        variant: "destructive",
      });
      return;
    }

    if (formData.transactionType === "Others" && !formData.customTransactionType) {
      toast({
        title: "Validation Error",
        description: "Please specify the custom transaction type",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Create New Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                data-testid="input-company-name"
              />
            </div>

            <div>
              <Label htmlFor="sector">Sector *</Label>
              <Select value={formData.sector} onValueChange={(value) => setFormData({ ...formData, sector: value })}>
                <SelectTrigger data-testid="select-sector">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.sector === "Others" && (
              <div>
                <Label htmlFor="customSector">Custom Sector *</Label>
                <Input
                  id="customSector"
                  value={formData.customSector}
                  onChange={(e) => setFormData({ ...formData, customSector: e.target.value })}
                  required
                  data-testid="input-custom-sector"
                />
              </div>
            )}

            <div>
              <Label htmlFor="transactionType">Transaction Type *</Label>
              <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value })}>
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M&A">M&A</SelectItem>
                  <SelectItem value="Fundraising">Fundraising</SelectItem>
                  <SelectItem value="Debt Financing">Debt Financing</SelectItem>
                  <SelectItem value="Strategic Advisory">Strategic Advisory</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.transactionType === "Others" && (
              <div>
                <Label htmlFor="customTransactionType">Custom Transaction Type *</Label>
                <Input
                  id="customTransactionType"
                  value={formData.customTransactionType}
                  onChange={(e) => setFormData({ ...formData, customTransactionType: e.target.value })}
                  required
                  data-testid="input-custom-transaction-type"
                />
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clientPoc">Client POC *</Label>
              <Input
                id="clientPoc"
                value={formData.clientPoc}
                onChange={(e) => setFormData({ ...formData, clientPoc: e.target.value })}
                required
                data-testid="input-client-poc"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                data-testid="input-phone-number"
              />
            </div>

            <div>
              <Label htmlFor="emailId">Email ID *</Label>
              <Input
                id="emailId"
                type="email"
                value={formData.emailId}
                onChange={(e) => setFormData({ ...formData, emailId: e.target.value })}
                required
                data-testid="input-email-id"
              />
            </div>
          </div>

          {/* Status and Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lastContacted">Last Contacted</Label>
              <Input
                id="lastContacted"
                type="date"
                value={formData.lastContacted}
                onChange={(e) => setFormData({ ...formData, lastContacted: e.target.value })}
                data-testid="input-last-contacted"
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NDA Shared">NDA Shared</SelectItem>
                  <SelectItem value="NDA Signed">NDA Signed</SelectItem>
                  <SelectItem value="IM/Financial Model">IM/Financial Model</SelectItem>
                  <SelectItem value="Investor Tracker">Investor Tracker</SelectItem>
                  <SelectItem value="Term Sheet">Term Sheet</SelectItem>
                  <SelectItem value="Due Diligence">Due Diligence</SelectItem>
                  <SelectItem value="Agreement">Agreement</SelectItem>
                  <SelectItem value="Transaction closed">Transaction closed</SelectItem>
                  <SelectItem value="Client Dropped">Client Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="createdBy">Created By</Label>
              <Input
                id="createdBy"
                value={user ? (user.name || user.username || user.email) : 'Loading...'}
                disabled
                className="bg-slate-50 text-slate-600"
                data-testid="input-created-by"
              />
            </div>
          </div>

          {/* Lead and Co-Lead Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leadAssignment">Lead</Label>
              <Select value={formData.leadAssignment || "none"} onValueChange={(value) => setFormData({ ...formData, leadAssignment: value === "none" ? "" : value })}>
                <SelectTrigger data-testid="select-lead-assignment">
                  <SelectValue placeholder="Select Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teamMembers.map((member: any) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="coLeadAssignment">Co-Lead</Label>
              <Select value={formData.coLeadAssignment || "none"} onValueChange={(value) => setFormData({ ...formData, coLeadAssignment: value === "none" ? "" : value })}>
                <SelectTrigger data-testid="select-co-lead-assignment">
                  <SelectValue placeholder="Select Co-Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teamMembers.map((member: any) => (
                    <SelectItem key={member.id} value={member.name}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Control Sheet Link */}
          <div>
            <Label htmlFor="controlSheetLink">Control Sheet (Google Drive Link)</Label>
            <Input
              id="controlSheetLink"
              type="url"
              value={formData.controlSheetLink}
              onChange={(e) => setFormData({ ...formData, controlSheetLink: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
              data-testid="input-control-sheet-link"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-client">
              {mutation.isPending ? "Saving..." : (client ? "Update Client" : "Create Client")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}