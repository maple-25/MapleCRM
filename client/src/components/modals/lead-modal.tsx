import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: any;
  user: any;
}

export default function LeadModal({ isOpen, onClose, lead, user }: LeadModalProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    sector: "",
    customSector: "",
    transactionType: "",
    customTransactionType: "",
    clientPoc: "",
    phoneNumber: "",
    emailId: "",
    firstContacted: "",
    lastContacted: "",
    sourceType: "",
    inboundSource: "",
    customInboundSource: "",
    outboundSource: "",
    acceptanceStage: "Undecided",
    status: "Initial Discussion",
    assignedTo: "",
    leadAssignment: "",
    coLeadAssignment: "",
    notes: "",
    convertToClient: false,
  });

  // Update form data when lead prop changes
  useEffect(() => {
    if (lead) {
      setFormData({
        companyName: lead.companyName || "",
        sector: lead.sector || "",
        customSector: lead.customSector || "",
        transactionType: lead.transactionType || "",
        customTransactionType: lead.customTransactionType || "",
        clientPoc: lead.clientPoc || "",
        phoneNumber: lead.phoneNumber || "",
        emailId: lead.emailId || "",
        firstContacted: lead.firstContacted ? new Date(lead.firstContacted).toISOString().split('T')[0] : "",
        lastContacted: lead.lastContacted ? new Date(lead.lastContacted).toISOString().split('T')[0] : "",
        sourceType: lead.sourceType || "",
        inboundSource: lead.inboundSource || "",
        customInboundSource: lead.customInboundSource || "",
        outboundSource: lead.outboundSource || "",
        acceptanceStage: lead.acceptanceStage || "Undecided",
        status: lead.status || "Initial Discussion",
        assignedTo: lead.assignedTo || "",
        leadAssignment: lead.leadAssignment || "",
        coLeadAssignment: lead.coLeadAssignment || "",
        notes: lead.notes || "",
        convertToClient: false,
      });
    } else {
      // Reset form for new lead
      setFormData({
        companyName: "",
        sector: "",
        customSector: "",
        transactionType: "",
        customTransactionType: "",
        clientPoc: "",
        phoneNumber: "",
        emailId: "",
        firstContacted: "",
        lastContacted: "",
        sourceType: "",
        inboundSource: "",
        customInboundSource: "",
        outboundSource: "",
        acceptanceStage: "Undecided",
        status: "Initial Discussion",
        assignedTo: "",
        leadAssignment: "",
        coLeadAssignment: "",
        notes: "",
        convertToClient: false,
      });
    }
  }, [lead]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active team members for Lead/Co-Lead dropdowns
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ['/api/team-members/active'],
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['/api/partners', user?.id],
    queryFn: () => apiRequest('GET', `/api/partners?userId=${user?.id}&userRole=${user?.role}`),
    enabled: isOpen && !!user?.id && !!user?.role,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const submitData = {
        ...data,
        firstContacted: data.firstContacted ? new Date(data.firstContacted) : null,
        lastContacted: data.lastContacted ? new Date(data.lastContacted) : null,
        ...(lead ? {} : { 
          ownerId: user.id,
          assignedTo: user.name || user.username || user.email // Auto-assign to creator
        }),
      };
      
      if (lead) {
        return apiRequest('PATCH', `/api/leads/${lead.id}`, submitData);
      } else {
        return apiRequest('POST', '/api/leads', submitData);
      }
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['/api/leads'] });
      const previousLeads = queryClient.getQueryData(['/api/leads', user.id]);
      
      if (lead) {
        queryClient.setQueryData(['/api/leads', user.id], (old: any) => {
          if (!old) return old;
          return old.map((l: any) => l.id === lead.id ? { ...l, ...data, updatedAt: new Date() } : l);
        });
      }
      
      return { previousLeads };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'], refetchType: 'none' });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/leads'] });
        queryClient.refetchQueries({ queryKey: ['/api/dashboard/stats'] });
        if (formData.convertToClient) {
          queryClient.refetchQueries({ queryKey: ['/api/clients'] });
        }
      }, 0);
      toast({
        title: "Success",
        description: lead ? "Lead updated successfully!" : "Lead created successfully!",
      });
      onClose();
    },
    onError: (error: any, _data, context: any) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['/api/leads', user.id], context.previousLeads);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.companyName || !formData.sector || !formData.transactionType || 
        !formData.clientPoc || !formData.emailId || !formData.sourceType) {
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

    if (formData.sourceType === "Inbound" && !formData.inboundSource) {
      toast({
        title: "Validation Error",
        description: "Please select an inbound source",
        variant: "destructive",
      });
      return;
    }

    if (formData.sourceType === "Inbound" && formData.inboundSource === "Others" && !formData.customInboundSource) {
      toast({
        title: "Validation Error",
        description: "Please specify the custom inbound source",
        variant: "destructive",
      });
      return;
    }

    if (formData.sourceType === "Outbound" && !formData.outboundSource) {
      toast({
        title: "Validation Error",
        description: "Please specify the outbound source",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      companyName: "",
      sector: "",
      customSector: "",
      transactionType: "",
      customTransactionType: "",
      clientPoc: "",
      phoneNumber: "",
      emailId: "",
      firstContacted: "",
      lastContacted: "",
      sourceType: "",
      inboundSource: "",
      customInboundSource: "",
      outboundSource: "",
      acceptanceStage: "Undecided",
      status: "Initial Discussion",
      assignedTo: "",
      notes: "",
      convertToClient: false,
    });
  };

  const handleClose = () => {
    if (!lead) resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "New Lead"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Contact Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstContacted">First Contacted</Label>
              <Input
                id="firstContacted"
                type="date"
                value={formData.firstContacted}
                onChange={(e) => setFormData({ ...formData, firstContacted: e.target.value })}
                data-testid="input-first-contacted"
              />
            </div>

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
          </div>

          {/* Source Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sourceType">Source *</Label>
              <Select value={formData.sourceType} onValueChange={(value) => setFormData({ ...formData, sourceType: value, inboundSource: "", outboundSource: "" })}>
                <SelectTrigger data-testid="select-source-type">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inbound">Inbound</SelectItem>
                  <SelectItem value="Outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.sourceType === "Inbound" && (
              <div>
                <Label htmlFor="inboundSource">Inbound Source *</Label>
                <Select value={formData.inboundSource} onValueChange={(value) => setFormData({ ...formData, inboundSource: value })}>
                  <SelectTrigger data-testid="select-inbound-source">
                    <SelectValue placeholder="Select inbound source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kotak Wealth">Kotak Wealth</SelectItem>
                    <SelectItem value="360 Wealth">360 Wealth</SelectItem>
                    <SelectItem value="LGT">LGT</SelectItem>
                    <SelectItem value="Pandion Partners">Pandion Partners</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.sourceType === "Inbound" && formData.inboundSource === "Others" && (
              <div>
                <Label htmlFor="customInboundSource">Custom Inbound Source *</Label>
                <Input
                  id="customInboundSource"
                  value={formData.customInboundSource}
                  onChange={(e) => setFormData({ ...formData, customInboundSource: e.target.value })}
                  required
                  data-testid="input-custom-inbound-source"
                />
              </div>
            )}

            {formData.sourceType === "Outbound" && (
              <div>
                <Label htmlFor="outboundSource">Outbound Source *</Label>
                <Input
                  id="outboundSource"
                  value={formData.outboundSource}
                  onChange={(e) => setFormData({ ...formData, outboundSource: e.target.value })}
                  required
                  data-testid="input-outbound-source"
                />
              </div>
            )}
          </div>

          {/* Status and Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="acceptanceStage">Acceptance Stage</Label>
              <Select value={formData.acceptanceStage} onValueChange={(value) => setFormData({ ...formData, acceptanceStage: value })}>
                <SelectTrigger data-testid="select-acceptance-stage">
                  <SelectValue placeholder="Select acceptance stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Undecided">Undecided</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial Discussion">Initial Discussion</SelectItem>
                  <SelectItem value="NDA">NDA</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
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

          {/* Convert to Client */}
          {!lead && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="convertToClient"
                checked={formData.convertToClient}
                onCheckedChange={(checked) => setFormData({ ...formData, convertToClient: checked as boolean })}
                data-testid="checkbox-convert-to-client"
              />
              <Label htmlFor="convertToClient">Convert to Client</Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-lead">
              {mutation.isPending ? "Saving..." : (lead ? "Update Lead" : "Create Lead")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}