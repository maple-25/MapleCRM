import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Mail, Phone, ExternalLink, Search, Download, Filter, X, Check, Upload, FileSpreadsheet, AlertCircle, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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

const FUND_TYPES = ['Family Office', 'PE/VC', 'Strategic', 'Angel Network'] as const;
const FUND_STAGES = ['Seed/Pre-Seed', 'Early', 'Late', 'Pre-IPO', 'Listed'] as const;
const FUND_SOURCES = ['Maple Tracker', 'Tracxn', 'Private Circle', 'Others'] as const;

export default function FundTrackerPage({ user, onLogout }: FundTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<FundTracker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stageFilters, setStageFilters] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateFundId, setDuplicateFundId] = useState<string | null>(null);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);
  const [selectedFunds, setSelectedFunds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sidebarWidth } = useSidebar();
  const [formData, setFormData] = useState<InsertFundTracker>({
    fundName: "",
    website: "",
    fundType: "",
    stages: [],
    source: "",
    contactPerson1: "",
    designation1: "",
    email1: "",
    phone1: "",
    contactPerson2: "",
    designation2: "",
    email2: "",
    phone2: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportData, isExporting } = useExport();

  const { data: rawFunds = [], isLoading } = useQuery<FundTracker[]>({
    queryKey: ['/api/fund-tracker'],
    queryFn: async () => {
      const response = await fetch('/api/fund-tracker');
      if (!response.ok) throw new Error('Failed to fetch funds');
      return response.json();
    },
  });

  // Sort alphabetically by fund name
  const funds = [...rawFunds].sort((a, b) => {
    const nameA = a.fundName?.toLowerCase() || '';
    const nameB = b.fundName?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch('/api/fund-tracker/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Failed to delete funds');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fund-tracker'] });
      toast({
        title: "Success",
        description: `Deleted ${result.deleted} funds successfully`,
      });
      setSelectedFunds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete funds",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/fund-tracker/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMsg = result.rowErrors && result.rowErrors.length > 0
          ? `${result.message}. Row ${result.rowErrors[0].row}: ${result.rowErrors[0].errors.join(', ')}`
          : result.message || 'Failed to import funds';
        throw new Error(errorMsg);
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fund-tracker'] });
      let description = `Imported ${result.imported} funds`;
      if (result.skipped > 0) {
        description += `, ${result.skipped} rows skipped`;
      }
      if (result.rowErrors && result.rowErrors.length > 0) {
        description += ` (${result.rowErrors.length} rows had issues)`;
      }
      toast({
        title: "Import Successful",
        description,
      });
      closeImportModal();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import funds",
        variant: "destructive",
      });
    },
  });

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
          const response = await fetch('/api/fund-tracker/parse', {
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
          setImportError(null);
        } catch (err: any) {
          setImportError(err.message || 'Failed to parse file');
          setImportData([]);
          setImportHeaders([]);
        } finally {
          setIsParsingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setImportError(err.message || 'Failed to read file');
      setIsParsingFile(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const resetForm = () => {
    setFormData({
      fundName: "",
      website: "",
      fundType: "",
      stages: [],
      source: "",
      contactPerson1: "",
      designation1: "",
      email1: "",
      phone1: "",
      contactPerson2: "",
      designation2: "",
      email2: "",
      phone2: "",
      notes: "",
    });
    setEditingFund(null);
    setDuplicateWarning(null);
    setDuplicateFundId(null);
    setBypassDuplicateCheck(false);
  };

  const handleOpenModal = (fund?: FundTracker) => {
    if (fund) {
      setEditingFund(fund);
      setFormData({
        fundName: fund.fundName,
        website: fund.website || "",
        fundType: fund.fundType || "",
        stages: fund.stages || [],
        source: fund.source || "",
        contactPerson1: fund.contactPerson1,
        designation1: fund.designation1,
        email1: fund.email1,
        phone1: (fund as any).phone1 || "",
        contactPerson2: fund.contactPerson2 || "",
        designation2: fund.designation2 || "",
        email2: fund.email2 || "",
        phone2: (fund as any).phone2 || "",
        notes: fund.notes || "",
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleStageToggle = (stage: string) => {
    setStageFilters(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  const handleFormStageToggle = (stage: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages?.includes(stage)
        ? prev.stages.filter(s => s !== stage)
        : [...(prev.stages || []), stage]
    }));
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setStageFilters([]);
    setSourceFilter('all');
  };

  const hasActiveFilters = typeFilter !== 'all' || stageFilters.length > 0 || sourceFilter !== 'all';

  const handleSubmit = (e: React.FormEvent, forceAdd: boolean = false) => {
    e.preventDefault();
    
    if (!formData.fundName || !formData.contactPerson1 || !formData.designation1 || !formData.email1) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate fund name (skip if user chose to add anyway)
    if (!forceAdd && !bypassDuplicateCheck) {
      const normalizedNewName = formData.fundName.trim().toLowerCase();
      const duplicateFund = funds.find(fund => {
        // Skip the current fund being edited
        if (editingFund && fund.id === editingFund.id) return false;
        return fund.fundName.trim().toLowerCase() === normalizedNewName;
      });

      if (duplicateFund) {
        setDuplicateWarning(`A fund with the name "${duplicateFund.fundName}" already exists.`);
        setDuplicateFundId(duplicateFund.id);
        return;
      }
    }

    // Clear warning and proceed
    setDuplicateWarning(null);
    setBypassDuplicateCheck(false);
    
    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddAnyway = (e: React.FormEvent) => {
    setBypassDuplicateCheck(true);
    setDuplicateWarning(null);
    setDuplicateFundId(null);
    handleSubmit(e, true);
  };

  const handleReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateFundId) {
      updateMutation.mutate({ id: duplicateFundId, data: formData });
      setDuplicateWarning(null);
      setDuplicateFundId(null);
    }
  };

  const handleInputChange = (field: keyof InsertFundTracker, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectFund = (id: string) => {
    setSelectedFunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        fund.fundName?.toLowerCase().includes(searchLower) ||
        fund.contactPerson1?.toLowerCase().includes(searchLower) ||
        fund.designation1?.toLowerCase().includes(searchLower) ||
        fund.email1?.toLowerCase().includes(searchLower) ||
        fund.contactPerson2?.toLowerCase().includes(searchLower) ||
        fund.designation2?.toLowerCase().includes(searchLower) ||
        fund.email2?.toLowerCase().includes(searchLower) ||
        fund.notes?.toLowerCase().includes(searchLower) ||
        fund.fundType?.toLowerCase().includes(searchLower) ||
        fund.source?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Type filter
    if (typeFilter !== 'all' && fund.fundType !== typeFilter) {
      return false;
    }
    
    // Stage filter (multi-select - fund must have at least one selected stage)
    if (stageFilters.length > 0) {
      const fundStages = fund.stages || [];
      const hasMatchingStage = stageFilters.some(stage => fundStages.includes(stage));
      if (!hasMatchingStage) return false;
    }
    
    // Source filter
    if (sourceFilter !== 'all' && fund.source !== sourceFilter) {
      return false;
    }
    
    return true;
  });

  const handleSelectAll = () => {
    if (selectedFunds.size === filteredFunds.length) {
      setSelectedFunds(new Set());
    } else {
      setSelectedFunds(new Set(filteredFunds.map(f => f.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedFunds.size > 0) {
      setShowBulkDeleteConfirm(true);
    }
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedFunds));
  };

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
                {selectedFunds.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    className="flex items-center gap-2"
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedFunds.size})
                  </Button>
                )}
                <Button
                  onClick={() => setIsImportModalOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-import-funds"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button
                  onClick={() => exportData({ dataType: 'fund-tracker', format: 'xlsx', filename: 'fund_tracker_export.xlsx' })}
                  variant="outline"
                  disabled={isExporting}
                  className="flex items-center gap-2"
                  data-testid="button-export-funds"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export'}
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

            {/* Filters and Search */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {FUND_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Stage Filter (Multi-select) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-[180px] justify-between"
                      data-testid="button-stage-filter"
                    >
                      {stageFilters.length > 0 ? (
                        <span className="truncate">{stageFilters.length} stage{stageFilters.length > 1 ? 's' : ''} selected</span>
                      ) : (
                        <span>Filter by Stage</span>
                      )}
                      <Filter className="h-4 w-4 ml-2 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2">
                      {FUND_STAGES.map((stage) => (
                        <div 
                          key={stage} 
                          className="flex items-center space-x-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                          onClick={() => handleStageToggle(stage)}
                        >
                          <Checkbox 
                            checked={stageFilters.includes(stage)}
                            onCheckedChange={() => handleStageToggle(stage)}
                            data-testid={`checkbox-stage-${stage.replace(/\//g, '-')}`}
                          />
                          <span className="text-sm">{stage}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Source Filter */}
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-source-filter">
                    <SelectValue placeholder="Filter by Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {FUND_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-slate-500 hover:text-slate-700"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear filters
                  </Button>
                )}

                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-[320px] ml-auto">
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
              
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Showing {filteredFunds.length} of {funds.length} funds
              </div>
            </div>

            {/* Table Card */}
            <Card>
              <CardContent className="p-0">
                <div className="sticky-table-container max-h-[calc(100vh-280px)] overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-white dark:bg-gray-900 z-10">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-white dark:bg-gray-900 w-12">
                          <Checkbox
                            checked={filteredFunds.length > 0 && selectedFunds.size === filteredFunds.length}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="sticky-column h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-white dark:bg-gray-900">Fund Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Stage(s)</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Contact 1</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Designation</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Email</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Contact 2</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Designation</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Email</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Notes</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Source</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky right-0 bg-white dark:bg-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
              {filteredFunds.length === 0 ? (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td colSpan={15} className="p-4 align-middle text-center py-8 text-slate-500">
                    {searchTerm || hasActiveFilters ? 'No funds match your filters.' : 'No funds found. Add your first fund to get started.'}
                  </td>
                </tr>
              ) : (
                filteredFunds.map((fund) => (
                  <tr key={fund.id} data-testid={`row-fund-${fund.id}`} className={`border-b transition-colors hover:bg-muted/50 ${selectedFunds.has(fund.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="p-4 align-middle w-12">
                      <Checkbox
                        checked={selectedFunds.has(fund.id)}
                        onCheckedChange={() => handleSelectFund(fund.id)}
                        data-testid={`checkbox-fund-${fund.id}`}
                      />
                    </td>
                    <td className="p-4 align-middle font-medium sticky-column">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate" title={fund.fundName}>{fund.fundName}</span>
                        {fund.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              let url = fund.website || '';
                              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                url = 'https://' + url;
                              }
                              window.open(url, '_blank');
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-6 w-6 shrink-0"
                            title={`Visit ${fund.fundName} website`}
                            data-testid={`button-website-${fund.id}`}
                          >
                            <Globe className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      {fund.fundType ? (
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{fund.fundType}</Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {fund.stages && fund.stages.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {fund.stages.map((stage: string) => (
                            <Badge key={stage} variant="outline" className="text-xs whitespace-nowrap">{stage}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
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
                      {(fund as any).phone1 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`tel:${(fund as any).phone1}`, '_blank')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2"
                            title={`Call ${fund.contactPerson1}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-slate-600">{(fund as any).phone1}</span>
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
                      {(fund as any).phone2 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`tel:${(fund as any).phone2}`, '_blank')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2"
                            title={`Call ${fund.contactPerson2}`}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-slate-600">{(fund as any).phone2}</span>
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
                    <td className="p-4 align-middle">
                      {fund.source ? (
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{fund.source}</Badge>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="website">Website</Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="e.g. www.example.com"
                    data-testid="input-website"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fundType">Type</Label>
                <Select 
                  value={formData.fundType || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fundType: value }))}
                >
                  <SelectTrigger data-testid="select-fund-type">
                    <SelectValue placeholder="Select fund type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select 
                  value={formData.source || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger data-testid="select-fund-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Investment Stage(s)</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md">
                {FUND_STAGES.map((stage) => (
                  <div 
                    key={stage}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer border transition-colors ${
                      formData.stages?.includes(stage)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-transparent'
                    }`}
                    onClick={() => handleFormStageToggle(stage)}
                  >
                    {formData.stages?.includes(stage) && <Check className="h-3 w-3" />}
                    <span className="text-sm">{stage}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click to select multiple stages</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <Label htmlFor="phone1">Phone</Label>
                <Input
                  id="phone1"
                  type="tel"
                  value={formData.phone1 || ""}
                  onChange={(e) => handleInputChange('phone1', e.target.value)}
                  placeholder="Enter phone number"
                  data-testid="input-phone-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <Label htmlFor="phone2">Phone</Label>
                <Input
                  id="phone2"
                  type="tel"
                  value={formData.phone2 || ""}
                  onChange={(e) => handleInputChange('phone2', e.target.value)}
                  placeholder="Enter phone number"
                  data-testid="input-phone-2"
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

            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" data-testid="duplicate-warning">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-800 font-medium">Duplicate Found</p>
                  <p className="text-amber-700 text-sm mt-1">{duplicateWarning}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
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
                  className="bg-navy-blue hover:bg-navy-blue-dark text-white"
                  style={{ backgroundColor: 'hsl(244, 84%, 32%)' }}
                  data-testid="button-save-fund"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingFund ? "Update Fund" : "Add Fund")}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Funds from Excel
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {/* File Upload Area */}
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

            {/* Parsing Indicator */}
            {isParsingFile && (
              <div className="text-center py-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{importError}</p>
              </div>
            )}

            {/* Preview Table */}
            {importData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Preview ({importData.length} rows found)</h3>
                  <p className="text-sm text-muted-foreground">
                    Required columns: Fund Name, Contact 1, Designation 1, Email 1
                  </p>
                </div>
                
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {importHeaders.slice(0, 8).map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {header}
                          </th>
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
                            <td key={j} className="px-3 py-2 whitespace-nowrap truncate max-w-[150px]">
                              {row[header] || '-'}
                            </td>
                          ))}
                          {importHeaders.length > 8 && (
                            <td className="px-3 py-2 text-muted-foreground">...</td>
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
                    <li>• Column headers are automatically matched (e.g., "Fund Name", "Name", "Contact 1", "Email")</li>
                    <li>• Type should be: Family Office, PE/VC, Strategic, or Angel Network</li>
                    <li>• Stages can be comma-separated: Seed/Pre-Seed, Early, Late, Pre-IPO, Listed</li>
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
              className="bg-navy-blue hover:bg-navy-blue-dark text-white"
              style={{ backgroundColor: 'hsl(244, 84%, 32%)' }}
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? "Importing..." : `Import ${importData.length} Funds`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-bulk-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedFunds.size} Funds?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected {selectedFunds.size} fund{selectedFunds.size > 1 ? 's' : ''} from the database.
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
          </div>
        </main>
      </div>
    </div>
  );
}