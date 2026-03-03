import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project, ProjectComment } from "@shared/schema";
import { format } from "date-fns";
import { Edit, MessageSquare, Calendar, User, Save, X, Trash2, Reply } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export default function ProjectDetailModal({ isOpen, onClose, project }: ProjectDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<"update" | "change" | "feedback">("update");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<"update" | "change" | "feedback">("update");
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    priority: "medium",
    status: "planning",
    startDate: "",
    dueDate: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery<ProjectComment[]>({
    queryKey: ['/api/projects', project?.id, 'comments'],
    enabled: isOpen && !!project?.id,
  });

  useEffect(() => {
    if (project && isOpen) {
      setEditData({
        name: project.name,
        description: project.description || "",
        priority: project.priority,
        status: project.status,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : "",
      });
    }
  }, [project, isOpen]);

  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => {
      const submitData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      };
      return apiRequest('PATCH', `/api/projects/${project?.id}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Project updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/projects/${project?.id}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project?.id, 'comments'] });
      setCommentText("");
      setCommentType("update");
      setReplyText("");
      setReplyingTo(null);
      toast({
        title: "Success",
        description: "Comment added successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/projects/${project?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onClose();
      toast({
        title: "Success",
        description: "Project deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiRequest('DELETE', `/api/projects/${project?.id}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project?.id, 'comments'] });
      toast({
        title: "Success",
        description: "Comment deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProject = () => {
    if (!editData.name) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    updateProjectMutation.mutate(editData);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('crmUser') || '{}');
    
    addCommentMutation.mutate({
      content: commentText,
      commentType: commentType,
      userId: currentUser.id || "admin-user-id",
    });
  };

  const handleAddReply = (parentCommentId: string) => {
    if (!replyText.trim()) {
      toast({
        title: "Validation Error",
        description: "Reply cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('crmUser') || '{}');
    
    addCommentMutation.mutate({
      content: replyText,
      commentType: replyType,
      userId: currentUser.id || "admin-user-id",
      parentCommentId: parentCommentId,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'change': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'feedback': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEditing ? 'Edit Project' : project.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-project">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" data-testid="button-delete-project">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this project? This action cannot be undone and will also delete all associated comments and members.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteProjectMutation.mutate()}
                          disabled={deleteProjectMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {isEditing ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Edit Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Project Name *</Label>
                    <Input
                      id="edit-name"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      data-testid="input-edit-project-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={3}
                      data-testid="textarea-edit-project-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-priority">Priority</Label>
                      <Select value={editData.priority} onValueChange={(value) => setEditData({ ...editData, priority: value })}>
                        <SelectTrigger data-testid="select-edit-project-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-status">Status</Label>
                      <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                        <SelectTrigger data-testid="select-edit-project-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-start-date">Start Date</Label>
                      <Input
                        id="edit-start-date"
                        type="date"
                        value={editData.startDate}
                        onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                        data-testid="input-edit-project-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-due-date">Due Date</Label>
                      <Input
                        id="edit-due-date"
                        type="date"
                        value={editData.dueDate}
                        onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                        data-testid="input-edit-project-due-date"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending} data-testid="button-save-project">
                      <Save className="h-4 w-4 mr-2" />
                      {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400 mt-2">
                        {project.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Badge className={`${getStatusColor(project.status)} text-xs`}>
                        {project.status.toUpperCase().replace('_', ' ')}
                      </Badge>
                      {project.priority && (
                        <Badge className={`${getPriorityColor(project.priority)} text-xs`}>
                          {project.priority.toUpperCase()} PRIORITY
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {project.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span>Start: {format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      {project.dueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span>Due: {format(new Date(project.dueDate), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
                      <SelectTrigger className="w-32" data-testid="select-comment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="change">Change</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    data-testid="textarea-add-comment"
                  />
                  <Button onClick={handleAddComment} disabled={addCommentMutation.isPending} data-testid="button-add-comment">
                    {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                  </Button>
                </div>

                <Separator />

                {/* Comments List */}
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                      No comments yet
                    </p>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id} className="space-y-3">
                        {/* Main Comment */}
                        <div className="border rounded-lg p-3 space-y-2 bg-white" data-testid={`comment-${comment.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-slate-100 text-xs">
                                  {comment.userName ? getInitials(comment.userName) : <User className="h-3 w-3" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 text-sm">
                                  {comment.userName || 'Unknown User'}
                                </span>
                                <Badge className={`${getCommentTypeColor(comment.commentType)} text-xs`}>
                                  {comment.commentType.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'No date'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="h-6 px-2 text-slate-500 hover:text-slate-700"
                                data-testid={`button-reply-comment-${comment.id}`}
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" data-testid={`button-delete-comment-${comment.id}`}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this comment? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                                      disabled={deleteCommentMutation.isPending}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {comment.content}
                          </p>

                          {/* Reply Form */}
                          {replyingTo === comment.id && (
                            <div className="mt-3 space-y-2 border-t pt-3">
                              <div className="flex gap-2">
                                <Select value={replyType} onValueChange={(value: any) => setReplyType(value)}>
                                  <SelectTrigger className="w-32" data-testid="select-reply-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="update">Update</SelectItem>
                                    <SelectItem value="change">Change</SelectItem>
                                    <SelectItem value="feedback">Feedback</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Textarea
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                data-testid={`textarea-reply-${comment.id}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAddReply(comment.id)}
                                  disabled={addCommentMutation.isPending}
                                  size="sm"
                                  data-testid={`button-submit-reply-${comment.id}`}
                                >
                                  {addCommentMutation.isPending ? "Replying..." : "Reply"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReplyingTo(null)}
                                  data-testid={`button-cancel-reply-${comment.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-2 border-l-2 border-slate-200 pl-3">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="bg-slate-50 rounded-lg p-2 space-y-2" data-testid={`reply-${reply.id}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="bg-slate-200 text-xs">
                                          {reply.userName ? getInitials(reply.userName) : <User className="h-2 w-2" />}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800 text-xs">
                                          {reply.userName || 'Unknown User'}
                                        </span>
                                        <Badge className={`${getCommentTypeColor(reply.commentType)} text-xs`}>
                                          {reply.commentType.toUpperCase()}
                                        </Badge>
                                        <span className="text-xs text-slate-500">
                                          {reply.createdAt ? formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true }) : 'No date'}
                                        </span>
                                      </div>
                                    </div>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-500 hover:text-red-700" data-testid={`button-delete-reply-${reply.id}`}>
                                          <Trash2 className="h-2 w-2" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Reply</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this reply? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteCommentMutation.mutate(reply.id)}
                                            disabled={deleteCommentMutation.isPending}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Meta Info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-slate-600 dark:text-slate-400">Created</label>
                  <p>{project.createdAt ? format(new Date(project.createdAt), 'MMM dd, yyyy') : 'No date'}</p>
                </div>
                <div>
                  <label className="font-medium text-slate-600 dark:text-slate-400">Owner</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    <span>Project Owner</span>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-slate-600 dark:text-slate-400">Project ID</label>
                  <p className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {project.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}