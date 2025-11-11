import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Calendar, User, ExternalLink, Copy, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

import ProjectDetailModal from "@/components/modals/project-detail-modal";
import ProjectModal from "@/components/modals/project-modal";
import { Project } from "@shared/schema";
import { format } from "date-fns";

interface ProjectsProps {
  user: any;
  onLogout: () => void;
}

export default function Projects({ user, onLogout }: ProjectsProps) {
  const { sidebarWidth } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects', user?.id, user?.role],
    queryFn: async () => {
      if (!user?.id || !user?.role) return [];
      const response = await fetch(`/api/projects?userId=${user.id}&userRole=${user.role}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
  });

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

  const filteredProjects = projects.filter((project: Project) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      (project.description && project.description.toLowerCase().includes(searchLower))
    );
  });

  const ongoingProjects = filteredProjects.filter((project: Project) => 
    ['planning', 'in_progress', 'on_hold'].includes(project.status)
  );
  
  const completedProjects = filteredProjects.filter((project: Project) => 
    ['completed', 'cancelled'].includes(project.status)
  );

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex pt-16">
        <Sidebar user={user} />
        <main className="flex-1 transition-all duration-300 ease-in-out overflow-auto p-6" style={{ marginLeft: `${sidebarWidth}px` }}>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2" data-testid="heading-projects">
                Projects Management
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Track and manage your projects
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
              data-testid="button-add-project"
            >
              <FolderOpen className="h-4 w-4" />
              Add New Project
            </Button>
          </div>

          {/* Search Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-projects"
                />
              </div>
              <Button variant="outline" size="sm" data-testid="button-filter-projects">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Ongoing Projects Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Ongoing Projects
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {ongoingProjects.length}
                  </Badge>
                </div>
                
                {ongoingProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-12">
                      <p className="text-slate-500 dark:text-slate-400">
                        No ongoing projects
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {ongoingProjects.map((project: Project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        getStatusColor={getStatusColor} 
                        getPriorityColor={getPriorityColor}
                        onClick={() => handleProjectClick(project)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Projects Section */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Completed Projects  
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {completedProjects.length}
                  </Badge>
                </div>
                
                {completedProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-12">
                      <p className="text-slate-500 dark:text-slate-400">
                        No completed projects
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {completedProjects.map((project: Project) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        getStatusColor={getStatusColor} 
                        getPriorityColor={getPriorityColor}
                        onClick={() => handleProjectClick(project)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


        </main>
      </div>
      
      {/* Create Project Modal */}
      <ProjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        user={user}
      />
      
      {/* Project Detail Modal */}
      <ProjectDetailModal 
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        project={selectedProject}
      />
    </div>
  );
}

// Project Card Component
interface ProjectCardProps {
  project: Project;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  onClick: () => void;
}

function ProjectCard({ project, getStatusColor, getPriorityColor, onClick }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" data-testid={`card-project-${project.id}`} onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2" data-testid={`title-project-${project.id}`}>
              {project.name}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2" data-testid={`description-project-${project.id}`}>
              {project.description || 'No description provided'}
            </p>
          </div>
          <div className="flex gap-1 ml-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Status and Priority Badges */}
          <div className="flex gap-2">
            <Badge className={`${getStatusColor(project.status)} text-xs`} data-testid={`status-project-${project.id}`}>
              {project.status.toUpperCase().replace('_', ' ')}
            </Badge>
            {project.priority && (
              <Badge className={`${getPriorityColor(project.priority)} text-xs`} data-testid={`priority-project-${project.id}`}>
                {project.priority.toUpperCase()} PRIORITY
              </Badge>
            )}
          </div>

          {/* Project Details */}
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>Created by: {(project as any).ownerName || 'Unknown'}</span>
            </div>
            
            {project.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Start: {format(new Date(project.startDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
            
            {project.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Due: {format(new Date(project.dueDate), 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}