import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle, AlertTriangle, Database, Search, Download, Upload, FileSpreadsheet } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useExport } from "@/hooks/useExport";
import { apiRequest } from "@/lib/queryClient";
import type { ClientMasterData, InsertClientMasterData, UserMasterDataPermission } from "@shared/schema";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ClientMasterDataProps {
  user: any;
  onLogout: () => void;
}

export default function ClientMasterDataPage({ user, onLogout }: ClientMasterDataProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<ClientMasterData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [addedEntry, setAddedEntry] = useState<ClientMasterData | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateEntryId, setDuplicateEntryId] = useState<string | null>(null);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sidebarWidth } = useSidebar();
  const [formData, setFormData] = useState<InsertClientMasterData>({
    name: "",
    designation: "",
    company: "",
    industry: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
    addedBy: user?.id || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportData, isExporting } = useExport();

  const { data: permission } = useQuery<UserMasterDataPermission>({
    queryKey: ['/api/master-data-permission', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/master-data-permission?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch permission');
      return response.json();
    },
  });

  const { data: rawMasterData = [], isLoading } = useQuery<ClientMasterData[]>({
    queryKey: ['/api/client-master-data', user?.id, user?.role],
    queryFn: async () => {
      const response = await fetch(`/api/client-master-data?userId=${user?.id}&userRole=${user?.role}`);
      if (!response.ok) throw new Error('Failed to fetch master data');
      return response.json();
    },
  });

  // Sort alphabetically by name
  const masterData = [...rawMasterData].sort((a, b) => {
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });


  const createMutation = useMutation({
    mutationFn: async (data: InsertClientMasterData) => {
      const response = await fetch('/api/client-master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create entry');
      return response.json();
    },
    onSuccess: (data: ClientMasterData) => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-master-data', user?.id, user?.role] });
      setAddedEntry(data);
      setShowConfirmation(true);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientMasterData> }) => {
      const response = await fetch(`/api/client-master-data/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-master-data', user?.id, user?.role] });
      toast({
        title: "Success",
        description: "Client master data updated successfully",
      });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/client-master-data/${id}?userRole=${user?.role}`, { 
        method: 'DELETE' 
      });
      if (!response.ok) throw new Error('Failed to delete entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-master-data', user?.id, user?.role] });
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const requestAccessMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/master-data-permission/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to request access');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data-permission', user?.id] });
      toast({
        title: "Success",
        description: "Access request sent. Waiting for admin approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to request access",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/client-master-data/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, userRole: user?.role }),
      });
      if (!response.ok) throw new Error('Failed to delete entries');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-master-data', user?.id, user?.role] });
      toast({
        title: "Success",
        description: `Deleted ${result.deleted} entries successfully`,
      });
      setSelectedEntries(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/client-master-data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, userId: user?.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to import entries');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-master-data', user?.id, user?.role] });
      toast({
        title: "Import Successful",
        description: `Imported ${result.imported} entries`,
      });
      closeImportModal();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import entries",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      designation: "",
      company: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      notes: "",
      addedBy: user?.id || "",
    });
    setEditingData(null);
    setDuplicateWarning(null);
    setDuplicateEntryId(null);
    setBypassDuplicateCheck(false);
  };

  const handleOpenModal = (data?: ClientMasterData) => {
    if (data) {
      setEditingData(data);
      setFormData({
        name: data.name,
        designation: data.designation || "",
        company: data.company || "",
        industry: data.industry || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        notes: data.notes || "",
        addedBy: data.addedBy,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, forceAdd: boolean = false) => {
    e.preventDefault();

    // Check for duplicate name (skip if user chose to add anyway)
    if (!forceAdd && !bypassDuplicateCheck) {
      const normalizedNewName = formData.name.trim().toLowerCase();
      const duplicateEntry = masterData.find(entry => {
        // Skip the current entry being edited
        if (editingData && entry.id === editingData.id) return false;
        return entry.name?.trim().toLowerCase() === normalizedNewName;
      });

      if (duplicateEntry) {
        setDuplicateWarning(`An entry with the name "${duplicateEntry.name}" already exists.`);
        setDuplicateEntryId(duplicateEntry.id);
        return;
      }
    }

    // Clear warning and proceed
    setDuplicateWarning(null);
    setBypassDuplicateCheck(false);

    if (editingData) {
      updateMutation.mutate({ id: editingData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddAnyway = (e: React.FormEvent) => {
    setBypassDuplicateCheck(true);
    setDuplicateWarning(null);
    setDuplicateEntryId(null);
    handleSubmit(e, true);
  };

  const handleReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateEntryId) {
      updateMutation.mutate({ id: duplicateEntryId, data: formData });
      setDuplicateWarning(null);
      setDuplicateEntryId(null);
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredData.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredData.map(e => e.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedEntries.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedEntries));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setImportError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string)?.split(',')[1];
          const response = await fetch('/api/client-master-data/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64 }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to parse file');
          }

          const result = await response.json();
          setImportHeaders(result.headers);
          setImportData(result.data);
          setIsParsingFile(false);
        } catch (error: any) {
          setImportError(error.message);
          setIsParsingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setImportError(error.message || 'Failed to read file');
      setIsParsingFile(false);
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportData([]);
    setImportHeaders([]);
    setImportError(null);
  };

  const handleImport = () => {
    if (importData.length > 0) {
      importMutation.mutate(importData);
    }
  };

  const filteredData = masterData.filter((entry) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(searchLower) ||
      entry.company?.toLowerCase().includes(searchLower) ||
      entry.designation?.toLowerCase().includes(searchLower) ||
      entry.email?.toLowerCase().includes(searchLower) ||
      entry.industry?.toLowerCase().includes(searchLower)
    );
  });

  const hasViewAccess = user?.role === 'admin' || permission?.hasViewAccess === 'true';
  const hasPendingRequest = permission?.requestedAt && permission?.hasViewAccess === 'false';

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      <Sidebar user={user} />
      <div
        className="transition-all duration-300 pt-20"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold" data-testid="heading-client-master-data">Client Master Data</h1>
            <div className="flex items-center gap-3">
              {selectedEntries.size > 0 && (
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  className="flex items-center gap-2"
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedEntries.size})
                </Button>
              )}
              <Button
                onClick={() => setIsImportModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-import-master-data"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => exportData({ 
                  dataType: 'client-master-data', 
                  format: 'xlsx', 
                  filename: 'client_master_data_export.xlsx',
                  userId: user?.id,
                  userRole: user?.role
                })}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2"
                data-testid="button-export-master-data"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button
                onClick={() => handleOpenModal()}
                data-testid="button-add-entry"
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>

          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">How to use Client Master Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong>Everyone can add entries</strong> by clicking the "Add Entry" button above. However, viewing the master data requires admin approval.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Click "Add Entry" to submit new client information</li>
                    <li>Regular users need to request viewing access from an admin</li>
                    <li>Admins can view all entries and approve access requests</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {!hasViewAccess && !hasPendingRequest && (
            <Alert className="mb-6" data-testid="alert-no-access">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Required</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>You need permission to view the client master data.</span>
                <Button
                  onClick={() => requestAccessMutation.mutate()}
                  disabled={requestAccessMutation.isPending}
                  size="sm"
                  data-testid="button-request-access"
                >
                  Request Access
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {hasPendingRequest && (
            <Alert className="mb-6" data-testid="alert-pending-request">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Request Pending</AlertTitle>
              <AlertDescription>
                Your access request is pending admin approval.
              </AlertDescription>
            </Alert>
          )}

          {hasViewAccess && (
            <Card data-testid="card-master-data">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Master Data Entries ({filteredData.length})</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-master-data"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8" data-testid="loading-state">Loading...</div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-state">
                    {searchTerm ? 'No entries match your search.' : 'No entries yet. Click "Add Entry" to create one.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredData.length > 0 && selectedEntries.size === filteredData.length}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((data) => (
                        <TableRow key={data.id} data-testid={`row-master-data-${data.id}`} className={selectedEntries.has(data.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedEntries.has(data.id)}
                              onCheckedChange={() => handleSelectEntry(data.id)}
                              data-testid={`checkbox-entry-${data.id}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`text-name-${data.id}`}>{data.name}</TableCell>
                          <TableCell data-testid={`text-designation-${data.id}`}>{data.designation || '-'}</TableCell>
                          <TableCell data-testid={`text-company-${data.id}`}>{data.company || '-'}</TableCell>
                          <TableCell data-testid={`text-industry-${data.id}`}>{data.industry || '-'}</TableCell>
                          <TableCell data-testid={`text-phone-${data.id}`}>{data.phone || '-'}</TableCell>
                          <TableCell data-testid={`text-email-${data.id}`}>{data.email || '-'}</TableCell>
                          <TableCell data-testid={`text-address-${data.id}`}>{data.address || '-'}</TableCell>
                          <TableCell data-testid={`text-notes-${data.id}`}>{data.notes || '-'}</TableCell>
                          <TableCell>
                            {(user?.role === 'admin' || data.addedBy === user?.id) ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenModal(data)}
                                  data-testid={`button-edit-${data.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMutation.mutate(data.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${data.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent data-testid="dialog-add-entry">
          <DialogHeader>
            <DialogTitle>{editingData ? 'Edit Entry' : 'Add New Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation ?? ""}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., CEO, CFO, Director"
                data-testid="input-designation"
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company ?? ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                data-testid="input-company"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry ?? ""}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Finance, Healthcare"
                data-testid="input-industry"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone ?? ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address ?? ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                data-testid="input-address"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes ?? ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes or comments..."
                data-testid="input-notes"
              />
            </div>
            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" data-testid="duplicate-warning">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-800 font-medium">Duplicate Found</p>
                  <p className="text-amber-700 text-sm mt-1">{duplicateWarning}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              {duplicateWarning ? (
                <>
                  <Button
                    type="button"
                    onClick={handleAddAnyway}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    data-testid="button-add-anyway"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Add Anyway"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReplace}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-replace"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Replace Existing"}
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingData ? 'Update' : 'Add'} Entry
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent data-testid="dialog-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Entry Added Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-4">
              <p className="font-medium text-foreground" data-testid="text-confirmation-message">The following entry has been added to Client Master Data:</p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div data-testid="text-confirmation-name">
                  <span className="font-semibold">Name:</span> {addedEntry?.name}
                </div>
                {addedEntry?.designation && (
                  <div data-testid="text-confirmation-designation">
                    <span className="font-semibold">Designation:</span> {addedEntry.designation}
                  </div>
                )}
                {addedEntry?.company && (
                  <div data-testid="text-confirmation-company">
                    <span className="font-semibold">Company:</span> {addedEntry.company}
                  </div>
                )}
                {addedEntry?.industry && (
                  <div data-testid="text-confirmation-industry">
                    <span className="font-semibold">Industry:</span> {addedEntry.industry}
                  </div>
                )}
                {addedEntry?.phone && (
                  <div data-testid="text-confirmation-phone">
                    <span className="font-semibold">Phone:</span> {addedEntry.phone}
                  </div>
                )}
                {addedEntry?.email && (
                  <div data-testid="text-confirmation-email">
                    <span className="font-semibold">Email:</span> {addedEntry.email}
                  </div>
                )}
                {addedEntry?.address && (
                  <div data-testid="text-confirmation-address">
                    <span className="font-semibold">Address:</span> {addedEntry.address}
                  </div>
                )}
                {addedEntry?.notes && (
                  <div data-testid="text-confirmation-notes">
                    <span className="font-semibold">Notes:</span> {addedEntry.notes}
                  </div>
                )}
              </div>
              {user?.role !== 'admin' && (
                <p className="text-muted-foreground text-xs" data-testid="text-confirmation-note">
                  Note: An admin needs to grant you viewing permissions before you can see all entries in the database.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction data-testid="button-confirmation-ok">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-bulk-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEntries.size} Entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected {selectedEntries.size} entr{selectedEntries.size > 1 ? 'ies' : 'y'} from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Client Master Data from Excel
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
                data-testid="input-file-upload"
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Click to upload Excel file</p>
              <p className="text-sm text-muted-foreground mt-1">Supports .xlsx and .xls files</p>
            </div>

            {isParsingFile && (
              <div className="text-center py-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{importError}</p>
              </div>
            )}

            {importData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Preview ({importData.length} rows found)</h3>
                  <p className="text-sm text-muted-foreground">
                    Required column: Name
                  </p>
                </div>
                <div className="max-h-[300px] overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {importHeaders.slice(0, 8).map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium">{header}</th>
                        ))}
                        {importHeaders.length > 8 && (
                          <th className="px-3 py-2 text-left font-medium">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {importHeaders.slice(0, 8).map((header, j) => (
                            <td key={j} className="px-3 py-2 truncate max-w-[150px]">{row[header] || '-'}</td>
                          ))}
                          {importHeaders.length > 8 && (
                            <td className="px-3 py-2">...</td>
                          )}
                        </tr>
                      ))}
                      {importData.length > 5 && (
                        <tr className="border-t bg-muted/50">
                          <td colSpan={Math.min(importHeaders.length, 9)} className="px-3 py-2 text-center text-muted-foreground">
                            ... and {importData.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">Column Mapping Info:</p>
                  <ul className="mt-1 text-blue-600 dark:text-blue-300 space-y-1">
                    <li>• Column headers are automatically matched (e.g., "Name", "Company", "Email")</li>
                    <li>• At minimum, a "Name" column is required</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={closeImportModal} data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={importData.length === 0 || importMutation.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? "Importing..." : `Import ${importData.length} Entries`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
