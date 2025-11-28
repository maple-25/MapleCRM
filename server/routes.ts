import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertClientSchema, insertProjectSchema, insertPartnerSchema, insertUserSchema, insertFundTrackerSchema, insertTeamMemberSchema, insertClientMasterDataSchema, insertUserMasterDataPermissionSchema, insertOutreachCampaignSchema, insertOutreachEmailSchema } from "@shared/schema";
import { z } from "zod";

import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {


  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Try to find user by email first
      let user = await storage.getUserByEmail(email);
      
      // If not found by email, try by username
      if (!user) {
        user = await storage.getUserByUsername(email);
      }
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || user.password !== currentPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await storage.updateUser(user.id, { password: newPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User management routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email or username already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      res.status(201).json({ ...newUser, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });



  // Partners routes
  app.get("/api/partners", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      if (userRole === 'admin') {
        // Admin users can see all partners
        const partners = await storage.getAllPartners();
        res.json(partners);
      } else {
        // Regular users see all partners (since partners are shared entities)
        // but we still maintain consistent API structure
        const partners = await storage.getAllPartners();
        res.json(partners);
      }
    } catch (error) {
      console.error('Partners error:', error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  app.post("/api/partners", async (req, res) => {
    try {
      const partner = insertPartnerSchema.parse(req.body);
      const newPartner = await storage.createPartner(partner);
      res.status(201).json(newPartner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create partner" });
      }
    }
  });

  // Leads routes
  app.get("/api/leads", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const leads = await storage.getLeadsByOwner(userId as string, userRole as string);
      res.json(leads);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/cold", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const coldLeads = await storage.getColdLeadsByOwner(userId as string, userRole as string);
      res.json(coldLeads);
    } catch (error) {
      console.error('Failed to fetch cold leads:', error);
      res.status(500).json({ message: "Failed to fetch cold leads" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const { convertToClient, ...leadData } = req.body;
      console.log('Received lead data:', leadData);
      
      // Clean up source fields based on source type
      if (leadData.sourceType === 'Outbound') {
        // For outbound leads, clear inbound source fields
        leadData.inboundSource = null;
        leadData.customInboundSource = null;
      } else if (leadData.sourceType === 'Inbound') {
        // For inbound leads, clear outbound source fields
        leadData.outboundSource = null;
      }
      
      // Convert empty strings to null for enum fields
      if (leadData.inboundSource === '') leadData.inboundSource = null;
      if (leadData.customInboundSource === '') leadData.customInboundSource = null;
      if (leadData.outboundSource === '') leadData.outboundSource = null;
      if (leadData.leadAssignment === '') leadData.leadAssignment = null;
      if (leadData.coLeadAssignment === '') leadData.coLeadAssignment = null;
      
      const lead = insertLeadSchema.parse(leadData);
      console.log('Parsed lead data:', lead);
      const newLead = await storage.createLead(lead);
      console.log('Created lead:', newLead);
      
      let client = null;
      if (convertToClient) {
        const conversion = await storage.convertLeadToClient(newLead.id);
        client = conversion?.client;
      }
      
      res.status(201).json({ lead: newLead, client });
    } catch (error) {
      console.error('Lead creation error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create lead", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating lead:', id, 'with data:', req.body);
      
      // Convert date strings to Date objects for Drizzle
      const updateData = { ...req.body };
      if (updateData.firstContacted && typeof updateData.firstContacted === 'string') {
        updateData.firstContacted = new Date(updateData.firstContacted);
      }
      if (updateData.lastContacted && typeof updateData.lastContacted === 'string') {
        updateData.lastContacted = new Date(updateData.lastContacted);
      }
      
      // Clean up source fields based on source type
      if (updateData.sourceType === 'Outbound') {
        // For outbound leads, clear inbound source fields
        updateData.inboundSource = null;
        updateData.customInboundSource = null;
      } else if (updateData.sourceType === 'Inbound') {
        // For inbound leads, clear outbound source fields
        updateData.outboundSource = null;
      }
      
      // Convert empty strings to null for enum fields
      if (updateData.inboundSource === '') updateData.inboundSource = null;
      if (updateData.customInboundSource === '') updateData.customInboundSource = null;
      if (updateData.outboundSource === '') updateData.outboundSource = null;
      if (updateData.leadAssignment === '') updateData.leadAssignment = null;
      if (updateData.coLeadAssignment === '') updateData.coLeadAssignment = null;
      
      const updatedLead = await storage.updateLead(id, updateData);
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(updatedLead);
    } catch (error) {
      console.error('Lead update error:', error);
      res.status(500).json({ message: "Failed to update lead", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting lead:', id);
      
      const success = await storage.deleteLead(id);
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error('Delete lead error:', error);
      res.status(500).json({ message: "Failed to delete lead", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Convert lead to client
  app.post('/api/leads/:id/convert-to-client', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.convertLeadToClient(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error converting lead to client:', error);
      res.status(500).json({ error: 'Failed to convert lead to client' });
    }
  });

  // Get leads by Lead/Co-Lead assignment
  app.get("/api/leads/by-assignment", async (req, res) => {
    try {
      const { assigneeName, userRole } = req.query;
      
      if (!assigneeName || !userRole) {
        return res.status(400).json({ message: "Assignee name and user role are required" });
      }
      
      const leads = await storage.getLeadsByLeadAssignment(assigneeName as string, userRole as string);
      res.json(leads);
    } catch (error) {
      console.error('Failed to fetch leads by assignment:', error);
      res.status(500).json({ message: "Failed to fetch leads by assignment" });
    }
  });

  // Clients routes
  app.get("/api/clients", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const clients = await storage.getClientsByOwner(userId as string, userRole as string);
      res.json(clients);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/past", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const pastClients = await storage.getPastClientsByOwner(userId as string, userRole as string);
      res.json(pastClients);
    } catch (error) {
      console.error('Failed to fetch past clients:', error);
      res.status(500).json({ message: "Failed to fetch past clients" });
    }
  });

  app.get("/api/clients/recent", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const recentClients = await storage.getRecentClientsByOwner(userId as string, userRole as string, 5);
      res.json(recentClients);
    } catch (error) {
      console.error('Failed to fetch recent clients:', error);
      res.status(500).json({ message: "Failed to fetch recent clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const client = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(client);
      res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create client" });
      }
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating client:', id, 'with data:', req.body);
      
      // Convert date strings to Date objects for Drizzle
      const updateData = { ...req.body };
      if (updateData.lastContacted && typeof updateData.lastContacted === 'string') {
        updateData.lastContacted = new Date(updateData.lastContacted);
      }
      
      // Convert empty strings to null for enum fields
      if (updateData.leadAssignment === '') updateData.leadAssignment = null;
      if (updateData.coLeadAssignment === '') updateData.coLeadAssignment = null;
      
      const updatedClient = await storage.updateClient(id, updateData);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.error('Client update error:', error);
      res.status(500).json({ message: "Failed to update client", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting client:', id);
      
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ message: "Failed to delete client", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Client comments routes
  app.get("/api/clients/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getClientComments(id);
      res.json(comments);
    } catch (error) {
      console.error('Get client comments error:', error);
      res.status(500).json({ message: "Failed to fetch client comments" });
    }
  });

  app.post("/api/clients/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Adding comment to client:', id, 'data:', req.body);
      
      const commentData = {
        ...req.body,
        clientId: id,
      };
      
      const newComment = await storage.addClientComment(commentData);
      res.status(201).json(newComment);
    } catch (error) {
      console.error('Create client comment error:', error);
      res.status(500).json({ message: "Failed to create client comment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/clients/:clientId/comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      console.log('Deleting client comment:', commentId);
      
      const success = await storage.deleteClientComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error('Delete client comment error:', error);
      res.status(500).json({ message: "Failed to delete comment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get clients by Lead/Co-Lead assignment
  app.get("/api/clients/by-assignment", async (req, res) => {
    try {
      const { assigneeName, userRole } = req.query;
      
      if (!assigneeName || !userRole) {
        return res.status(400).json({ message: "Assignee name and user role are required" });
      }
      
      const clients = await storage.getClientsByLeadAssignment(assigneeName as string, userRole as string);
      res.json(clients);
    } catch (error) {
      console.error('Failed to fetch clients by assignment:', error);
      res.status(500).json({ message: "Failed to fetch clients by assignment" });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const projects = await storage.getProjectsForUser(userId as string, userRole as string);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      console.log('Creating project with data:', req.body);
      
      // Convert date strings to Date objects for Drizzle
      const projectData = { ...req.body };
      if (projectData.startDate && typeof projectData.startDate === 'string') {
        projectData.startDate = new Date(projectData.startDate);
      }
      if (projectData.dueDate && typeof projectData.dueDate === 'string') {
        projectData.dueDate = new Date(projectData.dueDate);
      }
      
      const project = insertProjectSchema.parse(projectData);
      const newProject = await storage.createProject(project);
      res.status(201).json(newProject);
    } catch (error) {
      console.error('Project creation error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating project:', id, 'with data:', req.body);
      
      // Convert date strings to Date objects for Drizzle
      const updateData = { ...req.body };
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      
      const updatedProject = await storage.updateProject(id, updateData);
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(updatedProject);
    } catch (error) {
      console.error('Project update error:', error);
      res.status(500).json({ message: "Failed to update project", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Project comments routes
  app.get("/api/projects/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getProjectComments(id);
      res.json(comments);
    } catch (error) {
      console.error('Get project comments error:', error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });

  app.post("/api/projects/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Adding comment to project:', id, 'data:', req.body);
      
      const commentData = {
        ...req.body,
        projectId: id,
      };
      
      const newComment = await storage.createProjectComment(commentData);
      res.status(201).json(newComment);
    } catch (error) {
      console.error('Create project comment error:', error);
      res.status(500).json({ message: "Failed to create project comment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting project:', id);
      
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ message: "Failed to delete project", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/projects/:projectId/comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      console.log('Deleting comment:', commentId);
      
      const success = await storage.deleteProjectComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ message: "Failed to delete comment", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const stats = await storage.getDashboardStats(userId as string, userRole as string);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Single data type export endpoint
  app.post("/api/export-single", async (req, res) => {
    try {
      const { dataType, format, userId, userRole } = req.body;
      
      if (!dataType || format !== 'xlsx') {
        return res.status(400).json({ message: "dataType and format=xlsx are required" });
      }

      let data;
      
      switch (dataType) {
        case 'leads':
          data = await storage.getAllLeads();
          break;
        case 'clients':
          data = await storage.getAllClients();
          break;
        case 'partners':
          data = await storage.getAllPartners();
          break;
        case 'fund-tracker':
          data = await storage.getAllFunds();
          break;
        case 'client-master-data':
          if (!userId || !userRole) {
            return res.status(400).json({ message: "userId and userRole are required for client-master-data export" });
          }
          data = await storage.getAllClientMasterData(userId, userRole);
          break;
        default:
          return res.status(400).json({ message: 'Invalid data type. Use: leads, clients, partners, fund-tracker, or client-master-data' });
      }

      // Use imported XLSX module
      
      // Create Excel workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, dataType);
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${dataType}_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Failed to export data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Fund Tracker routes
  app.get("/api/fund-tracker", async (req, res) => {
    try {
      const funds = await storage.getAllFunds();
      res.json(funds);
    } catch (error) {
      console.error("Failed to fetch funds:", error);
      res.status(500).json({ message: "Failed to fetch funds" });
    }
  });

  app.get("/api/fund-tracker/:id", async (req, res) => {
    try {
      const fund = await storage.getFund(req.params.id);
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json(fund);
    } catch (error) {
      console.error("Failed to fetch fund:", error);
      res.status(500).json({ message: "Failed to fetch fund" });
    }
  });

  app.post("/api/fund-tracker", async (req, res) => {
    try {
      const fundData = insertFundTrackerSchema.parse(req.body);
      const fund = await storage.createFund(fundData);
      res.status(201).json(fund);
    } catch (error) {
      console.error("Failed to create fund:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund" });
    }
  });

  app.patch("/api/fund-tracker/:id", async (req, res) => {
    try {
      const fundData = insertFundTrackerSchema.partial().parse(req.body);
      const fund = await storage.updateFund(req.params.id, fundData);
      
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      
      res.json(fund);
    } catch (error) {
      console.error("Failed to update fund:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update fund" });
    }
  });

  app.delete("/api/fund-tracker/:id", async (req, res) => {
    try {
      const success = await storage.deleteFund(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json({ message: "Fund deleted successfully" });
    } catch (error) {
      console.error("Failed to delete fund:", error);
      res.status(500).json({ message: "Failed to delete fund" });
    }
  });

  // Fund Tracker Bulk Delete
  app.post("/api/fund-tracker/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No fund IDs provided" });
      }

      let deleted = 0;
      for (const id of ids) {
        const success = await storage.deleteFund(id);
        if (success) deleted++;
      }

      res.json({ deleted, message: `Deleted ${deleted} funds successfully` });
    } catch (error) {
      console.error("Failed to bulk delete funds:", error);
      res.status(500).json({ message: "Failed to delete funds" });
    }
  });

  // Fund Tracker Import
  app.post("/api/fund-tracker/import", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }

      // Column mapping - map common Excel headers to our fields
      const columnMap: Record<string, string> = {
        'fund name': 'fundName',
        'fundname': 'fundName',
        'name': 'fundName',
        'fund': 'fundName',
        'website': 'website',
        'web': 'website',
        'url': 'website',
        'site': 'website',
        'fund website': 'website',
        'type': 'fundType',
        'fund type': 'fundType',
        'fundtype': 'fundType',
        'category': 'fundType',
        'stage': 'stages',
        'stages': 'stages',
        'investment stage': 'stages',
        'investment stages': 'stages',
        'source': 'source',
        'data source': 'source',
        'datasource': 'source',
        'origin': 'source',
        'contact 1': 'contactPerson1',
        'contact person 1': 'contactPerson1',
        'contact1': 'contactPerson1',
        'primary contact': 'contactPerson1',
        'contact': 'contactPerson1',
        'contact name': 'contactPerson1',
        'designation 1': 'designation1',
        'designation1': 'designation1',
        'title 1': 'designation1',
        'title': 'designation1',
        'designation': 'designation1',
        'email 1': 'email1',
        'email1': 'email1',
        'primary email': 'email1',
        'email': 'email1',
        'contact 2': 'contactPerson2',
        'contact person 2': 'contactPerson2',
        'contact2': 'contactPerson2',
        'secondary contact': 'contactPerson2',
        'designation 2': 'designation2',
        'designation2': 'designation2',
        'title 2': 'designation2',
        'email 2': 'email2',
        'email2': 'email2',
        'secondary email': 'email2',
        'phone 1': 'phone1',
        'phone1': 'phone1',
        'phone': 'phone1',
        'primary phone': 'phone1',
        'mobile 1': 'phone1',
        'mobile': 'phone1',
        'contact phone': 'phone1',
        'phone 2': 'phone2',
        'phone2': 'phone2',
        'secondary phone': 'phone2',
        'mobile 2': 'phone2',
        'notes': 'notes',
        'comments': 'notes',
        'note': 'notes',
      };

      // Valid fund types, stages, and sources for validation
      const validFundTypes = ['Family Office', 'PE/VC', 'Strategic', 'Angel Network'];
      const validStages = ['Seed/Pre-Seed', 'Early', 'Late', 'Pre-IPO', 'Listed'];
      const validSources = ['Maple Tracker', 'Tracxn', 'Private Circle', 'Others'];

      // Track row-level errors
      const rowErrors: { row: number; errors: string[] }[] = [];
      const validFunds: any[] = [];

      // Process and map the data
      data.forEach((row: Record<string, any>, index: number) => {
        const mapped: Record<string, any> = {};
        const errors: string[] = [];

        // Map each column from the Excel data
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim();
          const mappedField = columnMap[normalizedKey];
          
          if (mappedField && value !== undefined && value !== null && value !== '') {
            if (mappedField === 'stages') {
              // Handle stages - could be comma-separated or single value
              const stageValue = String(value).trim();
              const stageArray = stageValue.split(/[,;]/).map(s => s.trim()).filter(s => s);
              // Only include valid stages
              mapped.stages = stageArray.filter(s => validStages.includes(s));
            } else if (mappedField === 'fundType') {
              // Validate fund type
              const typeValue = String(value).trim();
              if (validFundTypes.includes(typeValue)) {
                mapped.fundType = typeValue;
              }
            } else if (mappedField === 'source') {
              // Validate source
              const sourceValue = String(value).trim();
              if (validSources.includes(sourceValue)) {
                mapped.source = sourceValue;
              }
            } else {
              mapped[mappedField] = String(value).trim();
            }
          }
        }

        // Validate required fields
        if (!mapped.fundName || String(mapped.fundName).trim() === '') {
          errors.push('Fund Name is required');
        }
        if (!mapped.contactPerson1 || String(mapped.contactPerson1).trim() === '') {
          errors.push('Contact Person 1 is required');
        }
        if (!mapped.designation1 || String(mapped.designation1).trim() === '') {
          errors.push('Designation 1 is required');
        }
        if (!mapped.email1 || String(mapped.email1).trim() === '') {
          errors.push('Email 1 is required');
        }
        // Basic email validation
        if (mapped.email1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mapped.email1))) {
          errors.push('Email 1 format is invalid');
        }
        if (mapped.email2 && mapped.email2.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mapped.email2))) {
          errors.push('Email 2 format is invalid');
        }

        if (errors.length > 0) {
          rowErrors.push({ row: index + 2, errors }); // +2 because Excel rows start at 1 and header is row 1
        } else {
          validFunds.push({
            fundName: mapped.fundName,
            website: mapped.website || null,
            fundType: mapped.fundType || null,
            stages: mapped.stages && mapped.stages.length > 0 ? mapped.stages : null,
            source: mapped.source || null,
            contactPerson1: mapped.contactPerson1,
            designation1: mapped.designation1,
            email1: mapped.email1,
            phone1: mapped.phone1 || null,
            contactPerson2: mapped.contactPerson2 || null,
            designation2: mapped.designation2 || null,
            email2: mapped.email2 || null,
            phone2: mapped.phone2 || null,
            notes: mapped.notes || null,
          });
        }
      });

      if (validFunds.length === 0) {
        return res.status(400).json({ 
          message: "No valid funds to import. Make sure each row has: Fund Name, Contact Person 1, Designation 1, and Email 1",
          rowErrors: rowErrors.slice(0, 10) // Return first 10 errors
        });
      }

      // Bulk create the valid funds
      const createdFunds = await storage.bulkCreateFunds(validFunds);
      
      res.status(201).json({ 
        message: `Successfully imported ${createdFunds.length} funds`,
        imported: createdFunds.length,
        skipped: data.length - createdFunds.length,
        rowErrors: rowErrors.slice(0, 10) // Return first 10 errors for reference
      });
    } catch (error) {
      console.error("Failed to import funds:", error);
      res.status(500).json({ message: "Failed to import funds" });
    }
  });

  // Fund Tracker Parse Preview (for previewing before import)
  app.post("/api/fund-tracker/parse", async (req, res) => {
    try {
      const { fileData } = req.body;
      
      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }

      // Parse base64 Excel file
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or has no data" });
      }

      // Get headers from the first row
      const headers = Object.keys(jsonData[0] as object);

      res.json({ 
        headers,
        data: jsonData,
        rowCount: jsonData.length
      });
    } catch (error) {
      console.error("Failed to parse Excel file:", error);
      res.status(500).json({ message: "Failed to parse Excel file. Make sure it's a valid .xlsx or .xls file" });
    }
  });

  // Team Members routes
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getAllTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get("/api/team-members/active", async (req, res) => {
    try {
      const members = await storage.getActiveTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch active team members:", error);
      res.status(500).json({ message: "Failed to fetch active team members" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Failed to create team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.patch("/api/team-members/:id", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(req.params.id, memberData);
      
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      res.json(member);
    } catch (error) {
      console.error("Failed to update team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      console.log('Attempting to delete team member with ID:', req.params.id);
      
      // First check if the member exists
      const existingMember = await storage.getTeamMember(req.params.id);
      console.log('Found existing member:', existingMember);
      
      if (!existingMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      const success = await storage.deleteTeamMember(req.params.id);
      console.log('Delete operation result:', success);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete team member" });
      }
      
      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      console.error("Failed to delete team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Client Master Data routes
  app.get("/api/client-master-data", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const data = await storage.getAllClientMasterData(userId as string, userRole as string);
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch client master data:", error);
      res.status(500).json({ message: "Failed to fetch client master data" });
    }
  });

  app.post("/api/client-master-data", async (req, res) => {
    try {
      const masterData = insertClientMasterDataSchema.parse(req.body);
      const created = await storage.createClientMasterData(masterData);
      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create client master data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client master data" });
    }
  });

  app.patch("/api/client-master-data/:id", async (req, res) => {
    try {
      const masterData = insertClientMasterDataSchema.partial().parse(req.body);
      const updated = await storage.updateClientMasterData(req.params.id, masterData);
      
      if (!updated) {
        return res.status(404).json({ message: "Client master data not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Failed to update client master data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client master data" });
    }
  });

  app.delete("/api/client-master-data/:id", async (req, res) => {
    try {
      const { userRole } = req.query;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete client master data" });
      }
      
      const success = await storage.deleteClientMasterData(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Client master data not found" });
      }
      
      res.json({ message: "Client master data deleted successfully" });
    } catch (error) {
      console.error("Failed to delete client master data:", error);
      res.status(500).json({ message: "Failed to delete client master data" });
    }
  });

  // Client Master Data Bulk Delete
  app.post("/api/client-master-data/bulk-delete", async (req, res) => {
    try {
      const { ids, userRole } = req.body;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete client master data" });
      }
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No entry IDs provided" });
      }

      let deleted = 0;
      for (const id of ids) {
        const success = await storage.deleteClientMasterData(id);
        if (success) deleted++;
      }

      res.json({ deleted, message: `Deleted ${deleted} entries successfully` });
    } catch (error) {
      console.error("Failed to bulk delete client master data:", error);
      res.status(500).json({ message: "Failed to delete entries" });
    }
  });

  // Client Master Data Parse Excel
  app.post("/api/client-master-data/parse", async (req, res) => {
    try {
      const { fileData } = req.body;
      
      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }

      const XLSX = require('xlsx');
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 2) {
        return res.status(400).json({ message: "File must contain headers and at least one row of data" });
      }

      const headers = (data[0] as string[]).map(h => String(h || '').trim());
      const rows = data.slice(1)
        .filter((row: any[]) => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, i) => {
            obj[header] = row[i] ?? '';
          });
          return obj;
        });

      res.json({ headers, data: rows });
    } catch (error) {
      console.error("Failed to parse Excel file:", error);
      res.status(500).json({ message: "Failed to parse Excel file" });
    }
  });

  // Client Master Data Import
  app.post("/api/client-master-data/import", async (req, res) => {
    try {
      const { data, userId } = req.body;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const columnMap: Record<string, string> = {
        'name': 'name',
        'client name': 'name',
        'contact': 'name',
        'contact name': 'name',
        'designation': 'designation',
        'title': 'designation',
        'position': 'designation',
        'company': 'company',
        'organization': 'company',
        'firm': 'company',
        'industry': 'industry',
        'sector': 'industry',
        'phone': 'phone',
        'phone number': 'phone',
        'mobile': 'phone',
        'email': 'email',
        'email address': 'email',
        'address': 'address',
        'location': 'address',
        'notes': 'notes',
        'comments': 'notes',
        'remarks': 'notes',
      };

      let imported = 0;

      for (const row of data) {
        const mappedData: Record<string, any> = { addedBy: userId };
        
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim();
          const mappedField = columnMap[normalizedKey];
          if (mappedField && value) {
            mappedData[mappedField] = String(value).trim();
          }
        }

        if (mappedData.name) {
          try {
            await storage.createClientMasterData(mappedData as any);
            imported++;
          } catch (err) {
            console.error("Failed to import row:", err);
          }
        }
      }

      res.json({ imported, message: `Imported ${imported} entries successfully` });
    } catch (error) {
      console.error("Failed to import client master data:", error);
      res.status(500).json({ message: "Failed to import client master data" });
    }
  });

  // User Master Data Permission routes
  app.get("/api/master-data-permission", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const permission = await storage.getUserMasterDataPermission(userId as string);
      res.json(permission || { hasViewAccess: 'false' });
    } catch (error) {
      console.error("Failed to fetch permission:", error);
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });

  app.post("/api/master-data-permission/request", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const permission = await storage.createPermissionRequest(userId);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Failed to create permission request:", error);
      res.status(500).json({ message: "Failed to create permission request" });
    }
  });

  app.get("/api/master-data-permission/pending", async (req, res) => {
    try {
      const { userRole } = req.query;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can view pending requests" });
      }
      
      const requests = await storage.getPendingPermissionRequests();
      res.json(requests);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.get("/api/master-data-permission/approved", async (req, res) => {
    try {
      const { userRole } = req.query;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can view approved permissions" });
      }
      
      const permissions = await storage.getApprovedPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Failed to fetch approved permissions:", error);
      res.status(500).json({ message: "Failed to fetch approved permissions" });
    }
  });

  app.post("/api/master-data-permission/approve/:userId", async (req, res) => {
    try {
      const { approvedBy, userRole } = req.body;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can approve permissions" });
      }
      
      if (!approvedBy) {
        return res.status(400).json({ message: "Approver ID is required" });
      }
      
      const permission = await storage.approvePermissionRequest(req.params.userId, approvedBy);
      
      if (!permission) {
        return res.status(404).json({ message: "Permission request not found" });
      }
      
      res.json(permission);
    } catch (error) {
      console.error("Failed to approve permission:", error);
      res.status(500).json({ message: "Failed to approve permission" });
    }
  });

  app.post("/api/master-data-permission/revoke/:userId", async (req, res) => {
    try {
      const { userRole } = req.body;
      
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Only admins can revoke permissions" });
      }
      
      const success = await storage.revokePermission(req.params.userId);
      
      if (!success) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      res.json({ message: "Permission revoked successfully" });
    } catch (error) {
      console.error("Failed to revoke permission:", error);
      res.status(500).json({ message: "Failed to revoke permission" });
    }
  });

  // Outreach Tracker routes
  
  // Get all outreach emails for the current user
  app.get("/api/outreach", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const emails = await storage.getAllOutreachEmails(userId as string);
      res.json(emails);
    } catch (error) {
      console.error("Failed to fetch outreach emails:", error);
      res.status(500).json({ message: "Failed to fetch outreach emails" });
    }
  });

  // Create a new outreach email
  app.post("/api/outreach", async (req, res) => {
    try {
      const emailData = insertOutreachEmailSchema.parse(req.body);
      const newEmail = await storage.createOutreachEmail(emailData);
      res.status(201).json(newEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to create outreach email:", error);
        res.status(500).json({ message: "Failed to create outreach email" });
      }
    }
  });

  // Bulk create outreach emails (for importing contacts)
  app.post("/api/outreach/bulk", async (req, res) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "No emails to create" });
      }
      
      const validEmails = emails.map((email: any) => insertOutreachEmailSchema.parse(email));
      const createdEmails = await storage.bulkCreateOutreachEmails(validEmails);
      
      res.status(201).json({
        message: `Created ${createdEmails.length} outreach emails`,
        created: createdEmails.length,
        emails: createdEmails
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to bulk create outreach emails:", error);
        res.status(500).json({ message: "Failed to create outreach emails" });
      }
    }
  });

  // Update an outreach email
  app.patch("/api/outreach/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const email = await storage.getOutreachEmail(id);
      
      if (!email) {
        return res.status(404).json({ message: "Outreach email not found" });
      }
      
      const updatedEmail = await storage.updateOutreachEmail(id, req.body);
      res.json(updatedEmail);
    } catch (error) {
      console.error("Failed to update outreach email:", error);
      res.status(500).json({ message: "Failed to update outreach email" });
    }
  });

  // Delete an outreach email
  app.delete("/api/outreach/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteOutreachEmail(id);
      
      if (!success) {
        return res.status(404).json({ message: "Outreach email not found" });
      }
      
      res.json({ message: "Outreach email deleted successfully" });
    } catch (error) {
      console.error("Failed to delete outreach email:", error);
      res.status(500).json({ message: "Failed to delete outreach email" });
    }
  });

  // Get contacts from Fund Tracker for outreach
  app.get("/api/outreach/contacts/fund-tracker", async (req, res) => {
    try {
      const funds = await storage.getAllFunds();
      
      // Extract all contacts from funds
      const contacts: any[] = [];
      
      funds.forEach(fund => {
        // Contact 1
        if (fund.email1) {
          contacts.push({
            name: fund.contactPerson1,
            email: fund.email1,
            company: fund.fundName,
            designation: fund.designation1,
            phone: (fund as any).phone1 || null,
            source: 'fund_tracker',
            sourceId: fund.id,
          });
        }
        
        // Contact 2
        if (fund.email2) {
          contacts.push({
            name: fund.contactPerson2,
            email: fund.email2,
            company: fund.fundName,
            designation: fund.designation2,
            phone: (fund as any).phone2 || null,
            source: 'fund_tracker',
            sourceId: fund.id,
          });
        }
      });
      
      res.json(contacts);
    } catch (error) {
      console.error("Failed to fetch fund tracker contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Get contacts from Client Master Data for outreach
  app.get("/api/outreach/contacts/client-master-data", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      
      const clientData = await storage.getAllClientMasterData(userId as string, userRole as string);
      
      // Extract contacts with emails
      const contacts = clientData
        .filter(client => client.email)
        .map(client => ({
          name: client.name,
          email: client.email,
          company: client.company,
          designation: client.designation,
          phone: client.phone || null,
          source: 'client_master_data',
          sourceId: client.id,
        }));
      
      res.json(contacts);
    } catch (error) {
      console.error("Failed to fetch client master data contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Outreach Campaigns routes
  app.get("/api/outreach/campaigns", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const campaigns = await storage.getAllOutreachCampaigns(userId as string);
      res.json(campaigns);
    } catch (error) {
      console.error("Failed to fetch outreach campaigns:", error);
      res.status(500).json({ message: "Failed to fetch outreach campaigns" });
    }
  });

  app.post("/api/outreach/campaigns", async (req, res) => {
    try {
      const campaignData = insertOutreachCampaignSchema.parse(req.body);
      const newCampaign = await storage.createOutreachCampaign(campaignData);
      res.status(201).json(newCampaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to create outreach campaign:", error);
        res.status(500).json({ message: "Failed to create outreach campaign" });
      }
    }
  });

  app.delete("/api/outreach/campaigns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteOutreachCampaign(id);
      
      if (!success) {
        return res.status(404).json({ message: "Outreach campaign not found" });
      }
      
      res.json({ message: "Outreach campaign deleted successfully" });
    } catch (error) {
      console.error("Failed to delete outreach campaign:", error);
      res.status(500).json({ message: "Failed to delete outreach campaign" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
