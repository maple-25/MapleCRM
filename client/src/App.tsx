import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Clients from "@/pages/clients";
import Projects from "@/pages/projects";
import Partners from "@/pages/partners";
import Settings from "@/pages/settings";
import FundTracker from "@/pages/fund-tracker";
import ClientMasterData from "@/pages/client-master-data";
import LoginPage from "@/pages/login";

function Router({ user, onLogin, onLogout }: { user: any; onLogin: (user: any) => void; onLogout: () => void; }) {
  if (!user) {
    return <LoginPage onLogin={onLogin} />;
  }

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard user={user} onLogout={onLogout} />} />
      <Route path="/leads" component={() => <Leads user={user} onLogout={onLogout} />} />
      <Route path="/clients" component={() => <Clients user={user} onLogout={onLogout} />} />
      <Route path="/projects" component={() => <Projects user={user} onLogout={onLogout} />} />
      <Route path="/partners" component={() => <Partners user={user} onLogout={onLogout} />} />
      <Route path="/fund-tracker" component={() => <FundTracker user={user} onLogout={onLogout} />} />
      <Route path="/client-master-data" component={() => <ClientMasterData user={user} onLogout={onLogout} />} />
      <Route path="/settings" component={() => <Settings user={user} onLogout={onLogout} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('crmUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('crmUser');
    localStorage.removeItem('rememberedUser');
  };

  // Check for remembered user on app load
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      try {
        const userData = JSON.parse(rememberedUser);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('rememberedUser');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />
          <Router user={user} onLogin={handleLogin} onLogout={handleLogout} />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
