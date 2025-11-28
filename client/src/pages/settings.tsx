import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Eye, EyeOff, Key, Users, Shield, Plus, Edit3, Database, CheckCircle, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

interface SettingsPageProps {
  user: any;
  onLogout: () => void;
}

export default function SettingsPage({ user, onLogout }: SettingsPageProps) {
  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  
  // New user form state
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user" as "user" | "admin"
  });

  // Change password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Team member form state
  const [teamMemberForm, setTeamMemberForm] = useState({
    name: "",
    email: "",
    position: "",
    isActive: "true"
  });
  const [editingMember, setEditingMember] = useState<any>(null);

  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingTeamMembers } = useQuery<any[]>({
    queryKey: ['/api/team-members'],
    enabled: user?.role === 'admin'
  });

  // Fetch all users (admin only)
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin'
  });

  // Fetch master data permissions (admin only)
  const { data: pendingRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data-permission/pending', user?.role],
    queryFn: async () => {
      const response = await fetch(`/api/master-data-permission/pending?userRole=${user?.role}`);
      if (!response.ok) throw new Error('Failed to fetch pending requests');
      return response.json();
    },
    enabled: user?.role === 'admin',
  });

  const { data: approvedPermissions = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data-permission/approved', user?.role],
    queryFn: async () => {
      const response = await fetch(`/api/master-data-permission/approved?userRole=${user?.role}`);
      if (!response.ok) throw new Error('Failed to fetch approved permissions');
      return response.json();
    },
    enabled: user?.role === 'admin',
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: typeof newUserForm) => apiRequest('POST', '/api/users', userData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully!",
      });
      setNewUserForm({
        email: "",
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest('DELETE', `/api/users/${userId}`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: typeof passwordForm) => apiRequest('POST', '/api/auth/change-password', {
      userId: user.id,
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Team member mutations
  const createTeamMemberMutation = useMutation({
    mutationFn: (memberData: typeof teamMemberForm) => apiRequest('POST', '/api/team-members', memberData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team member added successfully!",
      });
      setTeamMemberForm({
        name: "",
        email: "",
        position: "",
        isActive: "true"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof teamMemberForm> }) => 
      apiRequest('PATCH', `/api/team-members/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team member updated successfully!",
      });
      setEditingMember(null);
      setTeamMemberForm({
        name: "",
        email: "",
        position: "",
        isActive: "true"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiRequest('DELETE', `/api/team-members/${memberId}`, {}),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team member removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserForm.email || !newUserForm.username || !newUserForm.password || !newUserForm.firstName || !newUserForm.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newUserForm.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(newUserForm);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === user.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }
    deleteUserMutation.mutate(userId);
  };

  // Team member handlers
  const handleCreateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamMemberForm.name) {
      toast({
        title: "Validation Error",
        description: "Please enter the team member's name",
        variant: "destructive",
      });
      return;
    }

    createTeamMemberMutation.mutate(teamMemberForm);
  };

  const handleEditTeamMember = (member: any) => {
    setEditingMember(member);
    setTeamMemberForm({
      name: member.name || "",
      email: member.email || "",
      position: member.position || "",
      isActive: member.isActive || "true"
    });
  };

  const handleUpdateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamMemberForm.name) {
      toast({
        title: "Validation Error",
        description: "Please enter the team member's name",
        variant: "destructive",
      });
      return;
    }

    updateTeamMemberMutation.mutate({
      id: editingMember.id,
      data: teamMemberForm
    });
  };

  const handleDeleteTeamMember = (memberId: string) => {
    deleteTeamMemberMutation.mutate(memberId);
  };

  const cancelEditTeamMember = () => {
    setEditingMember(null);
    setTeamMemberForm({
      name: "",
      email: "",
      position: "",
      isActive: "true"
    });
  };

  // Master data permission mutations
  const approveRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/master-data-permission/approve/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: user?.id, userRole: user?.role }),
      });
      if (!response.ok) throw new Error('Failed to approve request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data-permission/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/master-data-permission/approved'] });
      toast({
        title: "Success",
        description: "Access request approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const revokePermissionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/master-data-permission/revoke/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: user?.role }),
      });
      if (!response.ok) throw new Error('Failed to revoke permission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data-permission/approved'] });
      toast({
        title: "Success",
        description: "Access permission revoked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke permission",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <div className="flex-1 transition-all duration-300 ease-in-out" style={{ marginLeft: `${sidebarWidth}px` }}>
          <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-800" data-testid="page-title">Settings</h1>
              <p className="text-slate-600 mt-2">Manage user accounts and system settings</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-1'}`}>
                <TabsTrigger value="password" data-testid="tab-password">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <TabsTrigger value="users" data-testid="tab-users">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </TabsTrigger>
                )}
                {user?.role === 'admin' && (
                  <TabsTrigger value="team" data-testid="tab-team">
                    <Users className="h-4 w-4 mr-2" />
                    Team Members
                  </TabsTrigger>
                )}
                {user?.role === 'admin' && (
                  <TabsTrigger value="masterdata" data-testid="tab-masterdata">
                    <Database className="h-4 w-4 mr-2" />
                    Master Data Access
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Change Password Tab */}
              <TabsContent value="password" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                            data-testid="input-current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Enter new password"
                          data-testid="input-new-password"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Management Tab (Admin Only) */}
              {user?.role === 'admin' && (
                <TabsContent value="users" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add New User */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <UserPlus className="h-5 w-5 mr-2" />
                          Add New User
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="firstName">First Name</Label>
                              <Input
                                id="firstName"
                                value={newUserForm.firstName}
                                onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                                placeholder="First name"
                                data-testid="input-first-name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input
                                id="lastName"
                                value={newUserForm.lastName}
                                onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                                placeholder="Last name"
                                data-testid="input-last-name"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                              placeholder="user@company.com"
                              data-testid="input-email"
                            />
                          </div>

                          <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              value={newUserForm.username}
                              onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                              placeholder="username"
                              data-testid="input-username"
                            />
                          </div>

                          <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                              id="password"
                              type="password"
                              value={newUserForm.password}
                              onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                              placeholder="Password (min 6 characters)"
                              data-testid="input-password"
                            />
                          </div>

                          <div>
                            <Label htmlFor="role">Role</Label>
                            <Select 
                              value={newUserForm.role} 
                              onValueChange={(value: "user" | "admin") => setNewUserForm({ ...newUserForm, role: value })}
                            >
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={createUserMutation.isPending}
                            data-testid="button-create-user"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Users List */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Users ({allUsers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {usersLoading ? (
                          <div className="text-center py-4">Loading users...</div>
                        ) : allUsers.length === 0 ? (
                          <div className="text-center py-4 text-slate-500">No users found</div>
                        ) : (
                          <div className="space-y-3">
                            {allUsers.map((userItem) => (
                              <div key={userItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium" data-testid={`user-name-${userItem.id}`}>
                                      {userItem.firstName} {userItem.lastName}
                                    </h4>
                                    <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                                      <Shield className="h-3 w-3 mr-1" />
                                      {userItem.role}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500" data-testid={`user-email-${userItem.id}`}>
                                    {userItem.email}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    @{userItem.username}
                                  </p>
                                </div>
                                
                                {userItem.id !== user.id && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`button-delete-user-${userItem.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete {userItem.firstName} {userItem.lastName}? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(userItem.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}

              {/* Team Members Tab (Admin Only) */}
              {user?.role === 'admin' && (
                <TabsContent value="team" className="mt-6">
                  <div className="space-y-6">
                    {/* Add Team Member Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Plus className="h-5 w-5 mr-2" />
                          {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={editingMember ? handleUpdateTeamMember : handleCreateTeamMember} className="space-y-4 max-w-md">
                          <div>
                            <Label htmlFor="memberName">Name *</Label>
                            <Input
                              id="memberName"
                              type="text"
                              value={teamMemberForm.name}
                              onChange={(e) => setTeamMemberForm({ ...teamMemberForm, name: e.target.value })}
                              placeholder="Enter full name"
                              data-testid="input-member-name"
                            />
                          </div>

                          <div>
                            <Label htmlFor="memberEmail">Email</Label>
                            <Input
                              id="memberEmail"
                              type="email"
                              value={teamMemberForm.email}
                              onChange={(e) => setTeamMemberForm({ ...teamMemberForm, email: e.target.value })}
                              placeholder="Enter email address"
                              data-testid="input-member-email"
                            />
                          </div>

                          <div>
                            <Label htmlFor="memberPosition">Position</Label>
                            <Input
                              id="memberPosition"
                              type="text"
                              value={teamMemberForm.position}
                              onChange={(e) => setTeamMemberForm({ ...teamMemberForm, position: e.target.value })}
                              placeholder="Enter position/title"
                              data-testid="input-member-position"
                            />
                          </div>

                          <div>
                            <Label htmlFor="memberStatus">Status</Label>
                            <Select
                              value={teamMemberForm.isActive} 
                              onValueChange={(value: "true" | "false") => setTeamMemberForm({ ...teamMemberForm, isActive: value })}
                            >
                              <SelectTrigger data-testid="select-member-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex space-x-3">
                            <Button 
                              type="submit" 
                              className="flex-1"
                              disabled={createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending}
                              data-testid="button-save-member"
                            >
                              {editingMember ? 
                                (updateTeamMemberMutation.isPending ? "Updating..." : "Update Member") :
                                (createTeamMemberMutation.isPending ? "Adding..." : "Add Member")
                              }
                            </Button>
                            {editingMember && (
                              <Button 
                                type="button" 
                                variant="outline"
                                onClick={cancelEditTeamMember}
                                data-testid="button-cancel-edit"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Team Members List */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Team Members ({teamMembers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTeamMembers ? (
                          <div className="text-center py-4">Loading team members...</div>
                        ) : teamMembers.length === 0 ? (
                          <div className="text-center py-4 text-slate-500">No team members found</div>
                        ) : (
                          <div className="space-y-3">
                            {teamMembers.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium" data-testid={`member-name-${member.id}`}>
                                      {member.name}
                                    </h4>
                                    <Badge variant={member.isActive === 'true' ? 'default' : 'secondary'}>
                                      {member.isActive === 'true' ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  {member.position && (
                                    <p className="text-sm text-slate-600" data-testid={`member-position-${member.id}`}>
                                      {member.position}
                                    </p>
                                  )}
                                  {member.email && (
                                    <p className="text-sm text-slate-500" data-testid={`member-email-${member.id}`}>
                                      {member.email}
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-400">
                                    Added: {new Date(member.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTeamMember(member)}
                                    data-testid={`button-edit-member-${member.id}`}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`button-delete-member-${member.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to remove {member.name} from the team? 
                                          This action cannot be undone and will affect Lead/Co-Lead assignment options.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteTeamMember(member.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}

              {/* Master Data Access Tab (Admin Only) */}
              {user?.role === 'admin' && (
                <TabsContent value="masterdata" className="mt-6">
                  <div className="space-y-6">
                    {/* Pending Access Requests */}
                    {pendingRequests.length > 0 && (
                      <Card data-testid="card-pending-requests">
                        <CardHeader>
                          <CardTitle>Pending Access Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {pendingRequests.map((request: any) => {
                              const requestUser = allUsers.find((u: any) => u.id === request.userId);
                              const userName = requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : request.userId;
                              return (
                                <div key={request.userId} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`row-request-${request.userId}`}>
                                  <div className="flex-1">
                                    <h4 className="font-medium">{userName}</h4>
                                    <p className="text-sm text-slate-500">
                                      Requested: {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => approveRequestMutation.mutate(request.userId)}
                                    disabled={approveRequestMutation.isPending}
                                    data-testid={`button-approve-${request.userId}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Users with Access */}
                    <Card data-testid="card-approved-permissions">
                      <CardHeader>
                        <CardTitle>Users with Access ({approvedPermissions.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {approvedPermissions.length === 0 ? (
                          <div className="text-center py-4 text-slate-500">No users have been granted access yet</div>
                        ) : (
                          <div className="space-y-3">
                            {approvedPermissions.map((permission: any) => {
                              const permissionUser = allUsers.find((u: any) => u.id === permission.userId);
                              const approverUser = allUsers.find((u: any) => u.id === permission.approvedBy);
                              const userName = permissionUser ? `${permissionUser.firstName} ${permissionUser.lastName}` : permission.userId;
                              const approverName = approverUser ? `${approverUser.firstName} ${approverUser.lastName}` : permission.approvedBy;
                              return (
                                <div key={permission.userId} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`row-approved-${permission.userId}`}>
                                  <div className="flex-1">
                                    <h4 className="font-medium" data-testid={`text-user-${permission.userId}`}>{userName}</h4>
                                    <p className="text-sm text-slate-600" data-testid={`text-approved-date-${permission.userId}`}>
                                      Approved: {permission.approvedAt ? new Date(permission.approvedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                    <p className="text-xs text-slate-400" data-testid={`text-approver-${permission.userId}`}>
                                      By: {approverName}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => revokePermissionMutation.mutate(permission.userId)}
                                    disabled={revokePermissionMutation.isPending}
                                    data-testid={`button-revoke-${permission.userId}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Revoke Access
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}