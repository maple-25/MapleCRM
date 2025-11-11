import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, User, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import type { ClientComment } from "@shared/schema";

interface ClientCommentsProps {
  clientId: string;
  user: any;
}

export default function ClientComments({ clientId, user }: ClientCommentsProps) {
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<"update" | "change" | "feedback">("update");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<"update" | "change" | "feedback">("update");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'comments'],
    queryFn: () => apiRequest('GET', `/api/clients/${clientId}/comments`),
  });

  const addCommentMutation = useMutation({
    mutationFn: (commentData: { content: string; commentType: string; userId: string; parentCommentId?: string }) =>
      apiRequest('POST', `/api/clients/${clientId}/comments`, commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
      setNewComment("");
      setIsAddingComment(false);
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

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiRequest('DELETE', `/api/clients/${clientId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'comments'] });
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

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      content: newComment,
      commentType: commentType,
      userId: user.id,
    });
  };

  const handleAddReply = (parentCommentId: string) => {
    if (!replyText.trim()) return;
    
    addCommentMutation.mutate({
      content: replyText,
      commentType: replyType,
      userId: user.id,
      parentCommentId: parentCommentId,
    });
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'update':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'change':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'feedback':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </CardTitle>
          <Button
            onClick={() => setIsAddingComment(true)}
            size="sm"
            className="flex items-center gap-1"
            data-testid="button-add-comment"
          >
            <Plus className="h-4 w-4" />
            Add Comment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {isAddingComment && (
          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Comment Type
                </label>
                <Select value={commentType} onValueChange={(value: "update" | "change" | "feedback") => setCommentType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="change">Change</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Comment
                </label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter your comment..."
                  rows={3}
                  data-testid="textarea-comment"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-save-comment"
                >
                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewComment("");
                  }}
                  data-testid="button-cancel-comment"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No comments yet</p>
            <p className="text-sm">Add the first comment to start tracking client interactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex space-x-3 p-3 border rounded-lg bg-white">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-100">
                      {comment.userName ? getInitials(comment.userName) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {comment.userName || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className={getCommentTypeColor(comment.commentType)}>
                          {comment.commentType}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'No date'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="h-8 px-2 text-slate-500 hover:text-slate-700"
                          data-testid={`button-reply-comment-${comment.id}`}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        {comment.userId === user.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                data-testid={`button-delete-comment-${comment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap mb-3">{comment.content}</p>
                    
                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <div className="border rounded-lg p-3 bg-slate-50 mt-3">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                              Reply Type
                            </label>
                            <Select value={replyType} onValueChange={(value: "update" | "change" | "feedback") => setReplyType(value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="change">Change</SelectItem>
                                <SelectItem value="feedback">Feedback</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Enter your reply..."
                              rows={2}
                              data-testid={`textarea-reply-${comment.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleAddReply(comment.id)}
                              disabled={!replyText.trim() || addCommentMutation.isPending}
                              size="sm"
                              data-testid={`button-save-reply-${comment.id}`}
                            >
                              {addCommentMutation.isPending ? "Adding..." : "Add Reply"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              data-testid={`button-cancel-reply-${comment.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 space-y-3">
                    {comment.replies.map((reply: any) => (
                      <div key={reply.id} className="flex space-x-3 p-3 border rounded-lg bg-slate-50">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-200 text-xs">
                            {reply.userName ? getInitials(reply.userName) : <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 text-sm">
                                {reply.userName || 'Unknown User'}
                              </span>
                              <Badge variant="outline" className={`${getCommentTypeColor(reply.commentType)} text-xs`}>
                                {reply.commentType}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {reply.createdAt ? formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true }) : 'No date'}
                              </span>
                            </div>
                            {reply.userId === user.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                                    data-testid={`button-delete-reply-${reply.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
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
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}