import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExportOptions {
  dataType: string;
  format: 'xlsx';
  filename?: string;
  userId?: string;
  userRole?: string;
}

export function useExport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const response = await fetch('/api/export-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: options.dataType,
          format: options.format,
          userId: options.userId,
          userRole: options.userRole
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      return response.blob();
    },
    onSuccess: (blob, variables) => {
      // Create blob and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = variables.filename || `${variables.dataType}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `${variables.dataType} data exported to Excel successfully`,
      });
      setIsExporting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
      setIsExporting(false);
    },
  });

  const exportData = (options: ExportOptions) => {
    setIsExporting(true);
    exportMutation.mutate(options);
  };

  return {
    exportData,
    isExporting,
  };
}