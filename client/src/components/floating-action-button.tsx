import { useState } from "react";
import { Plus, UserPlus, FolderOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LeadModal from "./modals/lead-modal";
import ProjectModal from "./modals/project-modal";
import ClientModal from "./modals/client-modal";

interface FloatingActionButtonProps {
  user: any;
}

export default function FloatingActionButton({ user }: FloatingActionButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleQuickAction = (action: string) => {
    setActiveModal(action);
    setIsMenuOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Quick Action Menu */}
          {isMenuOpen && (
            <Card className="absolute bottom-16 right-0 p-2 w-48 shadow-lg border">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-50"
                  onClick={() => handleQuickAction('lead')}
                  data-testid="fab-new-lead"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <UserPlus className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">New Lead</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-50"
                  onClick={() => handleQuickAction('project')}
                  data-testid="fab-new-project"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">New Project</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-50"
                  onClick={() => handleQuickAction('client')}
                  data-testid="fab-new-client"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-medium">New Client</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Main FAB Button */}
          <Button
            size="lg"
            className={`w-14 h-14 rounded-full shadow-lg transition-all duration-200 ${
              isMenuOpen ? 'rotate-45 scale-105' : 'hover:scale-105'
            }`}
            onClick={toggleMenu}
            data-testid="fab-main-button"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <LeadModal 
        isOpen={activeModal === 'lead'} 
        onClose={() => setActiveModal(null)}
        user={user}
      />
      <ProjectModal 
        isOpen={activeModal === 'project'} 
        onClose={() => setActiveModal(null)}
        user={user}
      />
      <ClientModal 
        isOpen={activeModal === 'client'} 
        onClose={() => setActiveModal(null)}
        user={user}
      />
    </>
  );
}
