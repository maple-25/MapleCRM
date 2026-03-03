import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Phone, Mail, Download, Search } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useSidebar } from '@/contexts/SidebarContext';
import type { Partner, Lead } from '@shared/schema';

interface PartnerData {
  partner: Partner;
  leads: Lead[];
  totalReferrals: number;
  successfulConversions: number;
  conversionRate: number;
  lastReferral: string | null;
}

const PARTNER_TABS = [
  { id: 'Kotak Wealth', label: 'Kotak Wealth', color: 'bg-blue-500' },
  { id: '360 Wealth', label: '360 Wealth', color: 'bg-green-500' },
  { id: 'LGT', label: 'LGT', color: 'bg-purple-500' },
  { id: 'Pandion Partners', label: 'Pandion Partners', color: 'bg-orange-500' },
  { id: 'Others', label: 'Others', color: 'bg-gray-500' }
];

interface PartnersProps {
  user: any;
  onLogout: () => void;
}

export default function Partners({ user, onLogout }: PartnersProps) {
  const { sidebarWidth } = useSidebar();
  const [activeTab, setActiveTab] = useState('Kotak Wealth');
  const [partnerContacts, setPartnerContacts] = useState<Record<string, any[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { exportData, isExporting } = useExport();

  const { data: partners = [], isLoading: partnersLoading } = useQuery<Partner[]>({
    queryKey: ['/api/partners', user.id],
    queryFn: () => apiRequest('GET', `/api/partners?userId=${user.id}&userRole=${user.role}`),
  });

  const { data: allLeads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads', user.id],
    queryFn: () => apiRequest('GET', `/api/leads?userId=${user.id}&userRole=${user.role}`),
  });

  // Calculate partner statistics
  const getPartnerData = (partnerName: string): PartnerData => {
    const partner = partners.find(p => p.name === partnerName) || {
      id: partnerName,
      name: partnerName,
      email: null,
      phone: null,
      website: null,
      commissionRate: '0.00',
      isActive: 'true',
      createdAt: new Date()
    } as Partner;

    const partnerLeads = allLeads.filter(lead => 
      lead.sourceType === 'Inbound' && lead.inboundSource === partnerName
    );

    const convertedLeads = partnerLeads.filter(lead => lead.isConverted === 'true');
    const totalReferrals = partnerLeads.length;
    const successfulConversions = convertedLeads.length;
    const conversionRate = totalReferrals > 0 ? (successfulConversions / totalReferrals) * 100 : 0;
    
    const lastReferral = partnerLeads.length > 0 
      ? partnerLeads.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0].createdAt
      : null;

    return {
      partner,
      leads: partnerLeads,
      totalReferrals,
      successfulConversions,
      conversionRate,
      lastReferral: lastReferral ? String(lastReferral) : null
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Initial Discussion': return 'bg-blue-100 text-blue-800';
      case 'NDA': return 'bg-yellow-100 text-yellow-800';
      case 'Engagement': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAcceptanceColor = (stage: string) => {
    switch (stage) {
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Undecided': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (partnersLoading || leadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-8">Loading partners data...</div>
      </div>
    );
  }

  const currentPartnerData = getPartnerData(activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <main className="flex-1 transition-all duration-300 ease-in-out overflow-auto p-6" style={{ marginLeft: `${sidebarWidth}px` }}>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Affiliate Partners</h1>
                <p className="text-slate-600 mt-2">Track and manage your affiliate partner relationships and referrals</p>
              </div>
              <Button
                onClick={() => exportData({ dataType: 'partners', format: 'xlsx', filename: 'partners_export.xlsx' })}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2"
                data-testid="button-export-partners"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
            </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {PARTNER_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="relative">
              <div className={`w-3 h-3 rounded-full ${tab.color} mr-2`}></div>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PARTNER_TABS.map((tab) => {
          const partnerData = getPartnerData(tab.id);
          
          const filteredLeads = partnerData.leads
            .filter((lead) => {
              if (!searchTerm) return true;
              const searchLower = searchTerm.toLowerCase();
              return (
                lead.companyName?.toLowerCase().includes(searchLower) ||
                lead.sector?.toLowerCase().includes(searchLower) ||
                lead.customSector?.toLowerCase().includes(searchLower) ||
                lead.transactionType?.toLowerCase().includes(searchLower) ||
                lead.customTransactionType?.toLowerCase().includes(searchLower) ||
                lead.status?.toLowerCase().includes(searchLower) ||
                lead.acceptanceStage?.toLowerCase().includes(searchLower) ||
                lead.clientPoc?.toLowerCase().includes(searchLower) ||
                lead.phoneNumber?.toLowerCase().includes(searchLower) ||
                lead.emailId?.toLowerCase().includes(searchLower)
              );
            })
            .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
          
          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {/* Partner Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-900">{tab.label} Partnership</h2>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-slate-600 mt-1">Established: January 2018</p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-slate-600">Total Referrals</div>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{partnerData.totalReferrals}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-slate-600">Successful Conversions</div>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{partnerData.successfulConversions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-slate-600">Conversion Rate</div>
                    <div className="text-3xl font-bold text-slate-900 mt-2">{partnerData.conversionRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-slate-600">Last Referral</div>
                    <div className="text-3xl font-bold text-slate-900 mt-2">
                      {partnerData.lastReferral 
                        ? formatDistanceToNow(new Date(partnerData.lastReferral), { addSuffix: true })
                        : 'N/A'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">{tab.label} Test</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{partnerData.partner.email || '-'}</TableCell>
                        <TableCell>{partnerData.partner.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recent Referrals */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Referrals</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search referrals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-partners"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredLeads.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {searchTerm ? 'No referrals match your search.' : `No referrals from ${tab.label} yet`}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Sector</TableHead>
                          <TableHead>Transaction</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads
                          .slice(0, 10)
                          .map((lead, index) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium" data-testid={`text-company-${index}`}>
                              {lead.companyName}
                            </TableCell>
                            <TableCell data-testid={`text-date-${index}`}>
                              {new Date(lead.createdAt!).toLocaleDateString()}
                            </TableCell>
                            <TableCell data-testid={`text-sector-${index}`}>
                              {lead.sector === 'Others' ? lead.customSector : lead.sector}
                            </TableCell>
                            <TableCell data-testid={`text-transaction-${index}`}>
                              {lead.transactionType === 'Others' ? lead.customTransactionType : lead.transactionType}
                            </TableCell>
                            <TableCell data-testid={`text-status-${index}`}>
                              <div className="flex gap-2">
                                <Badge className={getStatusColor(lead.status)}>
                                  {lead.status}
                                </Badge>
                                <Badge className={getAcceptanceColor(lead.acceptanceStage)}>
                                  {lead.acceptanceStage}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`text-contact-${index}`}>
                              <div className="flex gap-2">
                                {lead.phoneNumber && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    title={lead.phoneNumber}
                                    onClick={() => window.open(`tel:${lead.phoneNumber}`, '_self')}
                                    data-testid={`button-call-${index}`}
                                  >
                                    <Phone className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title={lead.emailId}
                                  onClick={() => window.open(`mailto:${lead.emailId}`, '_self')}
                                  data-testid={`button-email-${index}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}