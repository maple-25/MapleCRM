import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Mail, Phone, ExternalLink, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useExport } from "@/hooks/useExport";
import { apiRequest } from "@/lib/queryClient";
import type { FundTracker, InsertFundTracker } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

interface FundTrackerProps {
  user: any;
  onLogout: () => void;
}

export default function FundTrackerPage({ user, onLogout }: FundTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<FundTracker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { sidebarWidth } = useSidebar();
  const [formData, setFormData] = useState<InsertFundTracker>({
    fundName: "",
    contactPerson1: "",
    designation1: "",
    email1: "",
    contactPerson2: "",
    designation2: "",
    email2: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportData, isExporting } = useExport();

  const { data: funds = [], isLoading } = useQuery<FundTracker[]>({
    queryKey: ['/api/fund-tracker'],
    queryFn: async () => {
      const response = await fetch('/api/fund-tracker');
      if (!response.ok) throw new Error('Failed to fetch funds');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFundTracker) => {
      const response = await fetch('/api/fund-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create fund');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fund-tracker'] });
      toast({
        title: "Success",
        description: "Fund added successfully",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add fund",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FundTracker> }) => {
      const response = await fetch(`/api/fund-tracker/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update fund');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fund-tracker'] });
      toast({
        title: "Success",
        description: "Fund updated successfully",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fund",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fund-tracker/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete fund');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fund-tracker'] });
      toast({
        title: "Success",
        description: "Fund deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete fund",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      fundName: "",
      contactPerson1: "",
      designation1: "",
      email1: "",
      contactPerson2: "",
      designation2: "",
      email2: "",
      notes: "",
    });
    setEditingFund(null);
  };

  const handleOpenModal = (fund?: FundTracker) => {
    if (fund) {
      setEditingFund(fund);
      setFormData({
        fundName: fund.fundName,
        contactPerson1: fund.contactPerson1,
        designation1: fund.designation1,
        email1: fund.email1,
        contactPerson2: fund.contactPerson2 || "",
        designation2: fund.designation2 || "",
        email2: fund.email2 || "",
        notes: fund.notes || "",
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fundName || !formData.contactPerson1 || !formData.designation1 || !formData.email1) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof InsertFundTracker, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-slate-600">Loading funds...</div>
        </div>
      </div>
    );
  }

  const filteredFunds = funds.filter((fund) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      fund.fundName?.toLowerCase().includes(searchLower) ||
      fund.contactPerson1?.toLowerCase().includes(searchLower) ||
      fund.designation1?.toLowerCase().includes(searchLower) ||
      fund.email1?.toLowerCase().includes(searchLower) ||
      fund.contactPerson2?.toLowerCase().includes(searchLower) ||
      fund.designation2?.toLowerCase().includes(searchLower) ||
      fund.email2?.toLowerCase().includes(searchLower) ||
      fund.notes?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 pt-20 transition-all duration-300 ease-in-out overflow-x-hidden" style={{ marginLeft: `${sidebarWidth}px` }}>
          <div className="p-6 space-y-4 max-w-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Fund Tracker</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage fund information and contacts</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => exportData({ dataType: 'fund-tracker', format: 'xlsx', filename: 'fund_tracker_export.xlsx' })}
                  variant="outline"
                  disabled={isExporting}
                  className="flex items-center gap-2"
                  data-testid="button-export-funds"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export to Excel'}
                </Button>
                <Button 
                  onClick={() => handleOpenModal()}
                  className="bg-navy-blue hover:bg-navy-blue-dark text-white shrink-0"
                  style={{ backgroundColor: 'hsl(244, 84%, 32%)' }}
                  data-testid="button-add-fund"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex justify-between items-center gap-4">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                All Funds ({filteredFunds.length})
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search funds..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-funds"
                />
              </div>
            </div>

            {/* Table Card */}
            <Card>
              <CardContent className="p-0">
                <div className="sticky-table-container max-h-[calc(100vh-280px)] overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-white dark:bg-gray-900 z-10">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="sticky-column h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-white dark:bg-gray-900">Fund Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Contact 1</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Designation</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Email</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Contact 2</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Designation</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Email</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Notes</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky right-0 bg-white dark:bg-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
              {filteredFunds.length === 0 ? (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td colSpan={9} className="p-4 align-middle text-center py-8 text-slate-500">
                    {searchTerm ? 'No funds match your search.' : 'No funds found. Add your first fund to get started.'}
                  </td>
                </tr>
              ) : (
                filteredFunds.map((fund) => (
                  <tr key={fund.id} data-testid={`row-fund-${fund.id}`} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium sticky-column">
                      <div className="font-semibold text-slate-900 dark:text-white truncate pr-2" title={fund.fundName}>{fund.fundName}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="font-medium">{fund.contactPerson1}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant="outline" className="text-xs">{fund.designation1}</Badge>
                    </td>
                    <td className="p-4 align-middle">
                      {fund.email1 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`mailto:${fund.email1}`, '_blank')}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                            title={`Email ${fund.contactPerson1}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-slate-600">{fund.email1}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {fund.contactPerson2 ? (
                        <div className="font-medium">{fund.contactPerson2}</div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {fund.designation2 ? (
                        <Badge variant="outline" className="text-xs">{fund.designation2}</Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {fund.email2 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`mailto:${fund.email2}`, '_blank')}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                            title={`Email ${fund.contactPerson2}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-slate-600">{fund.email2}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {fund.notes ? (
                        <div className="text-sm text-slate-600 max-w-32 truncate" title={fund.notes}>
                          {fund.notes}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right sticky right-0 bg-white dark:bg-gray-900 z-10">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(fund)}
                          data-testid={`button-edit-fund-${fund.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${fund.fundName}?`)) {
                              deleteMutation.mutate(fund.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-fund-${fund.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFund ? "Edit Fund" : "Add New Fund"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="fundName">Fund Name *</Label>
                <Input
                  id="fundName"
                  value={formData.fundName}
                  onChange={(e) => handleInputChange('fundName', e.target.value)}
                  placeholder="Enter fund name"
                  required
                  data-testid="input-fund-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson1">Contact Person 1 *</Label>
                <Input
                  id="contactPerson1"
                  value={formData.contactPerson1}
                  onChange={(e) => handleInputChange('contactPerson1', e.target.value)}
                  placeholder="Enter contact person name"
                  required
                  data-testid="input-contact-person-1"
                />
              </div>
              <div>
                <Label htmlFor="designation1">Designation *</Label>
                <Input
                  id="designation1"
                  value={formData.designation1}
                  onChange={(e) => handleInputChange('designation1', e.target.value)}
                  placeholder="Enter designation"
                  required
                  data-testid="input-designation-1"
                />
              </div>
              <div>
                <Label htmlFor="email1">Email *</Label>
                <Input
                  id="email1"
                  type="email"
                  value={formData.email1}
                  onChange={(e) => handleInputChange('email1', e.target.value)}
                  placeholder="Enter email address"
                  required
                  data-testid="input-email-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson2">Contact Person 2</Label>
                <Input
                  id="contactPerson2"
                  value={formData.contactPerson2 || ""}
                  onChange={(e) => handleInputChange('contactPerson2', e.target.value)}
                  placeholder="Enter contact person name"
                  data-testid="input-contact-person-2"
                />
              </div>
              <div>
                <Label htmlFor="designation2">Designation</Label>
                <Input
                  id="designation2"
                  value={formData.designation2 || ""}
                  onChange={(e) => handleInputChange('designation2', e.target.value)}
                  placeholder="Enter designation"
                  data-testid="input-designation-2"
                />
              </div>
              <div>
                <Label htmlFor="email2">Email</Label>
                <Input
                  id="email2"
                  type="email"
                  value={formData.email2 || ""}
                  onChange={(e) => handleInputChange('email2', e.target.value)}
                  placeholder="Enter email address"
                  data-testid="input-email-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes/Comments</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter any additional notes or comments"
                rows={3}
                data-testid="input-notes"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-navy-blue hover:bg-navy-blue-dark text-white"
                style={{ backgroundColor: 'hsl(244, 84%, 32%)' }}
                data-testid="button-save-fund"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingFund ? "Update Fund" : "Add Fund")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}