import type { Express } from "express";
import { storage } from "./storage";
import { authenticateBotRequest } from "./middleware/bot-auth";
import { z } from "zod";
import { insertLeadSchema } from "@shared/schema";

/**
 * Bot API Routes
 * These routes are called by the Telegram/WhatsApp bot
 * All routes require bot authentication via X-Bot-Key header
 */
export function registerBotRoutes(app: Express): void {
  // ============================================
  // User Linking Routes
  // ============================================

  /**
   * Link a bot user (Telegram/WhatsApp) to a CRM user
   * POST /api/bot/link-account
   */
  app.post(
    "/api/bot/link-account",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId, platformUsername, email, password } =
          req.body;

        // Validate required fields
        if (!platform || !platformUserId || !email || !password) {
          return res.status(400).json({
            success: false,
            message:
              "Missing required fields: platform, platformUserId, email, password",
          });
        }

        // Verify user credentials
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.getUserByUsername(email);
        }

        if (!user || user.password !== password) {
          return res.status(401).json({
            success: false,
            message: "Invalid email or password",
          });
        }

        // Check if mapping already exists
        const existingMapping = await storage.getBotUserMapping(
          platform,
          platformUserId,
        );

        if (existingMapping) {
          // Update existing mapping
          const updated = await storage.updateBotUserMapping(
            platform,
            platformUserId,
            {
              crmUserId: user.id,
              platformUsername,
              isActive: "true",
            },
          );

          return res.json({
            success: true,
            message: "Account re-linked successfully",
            mapping: updated,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            },
          });
        }

        // Create new mapping
        const mapping = await storage.createBotUserMapping({
          platform,
          platformUserId,
          platformUsername,
          crmUserId: user.id,
          isActive: "true",
        });

        res.json({
          success: true,
          message: "Account linked successfully",
          mapping,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        console.error("Link account error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to link account",
        });
      }
    },
  );

  /**
   * Unlink a bot user account
   * POST /api/bot/unlink-account
   */
  app.post(
    "/api/bot/unlink-account",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.body;

        if (!platform || !platformUserId) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields: platform, platformUserId",
          });
        }

        await storage.deactivateBotUserMapping(platform, platformUserId);

        res.json({
          success: true,
          message: "Account unlinked successfully",
        });
      } catch (error) {
        console.error("Unlink account error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to unlink account",
        });
      }
    },
  );

  /**
   * Get user info from bot user ID
   * GET /api/bot/user-info/:platform/:platformUserId
   */
  app.get(
    "/api/bot/user-info/:platform/:platformUserId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.params;

        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId,
        );

        if (!mapping) {
          return res.status(404).json({
            success: false,
            message: "User not linked. Please link your account first.",
          });
        }

        const user = await storage.getUser(mapping.crmUserId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "CRM user not found",
          });
        }

        res.json({
          success: true,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          },
          mapping: {
            platform: mapping.platform,
            platformUsername: mapping.platformUsername,
            linkedAt: mapping.linkedAt,
          },
        });
      } catch (error) {
        console.error("Get user info error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get user info",
        });
      }
    },
  );

  // ============================================
  // Lead Management Routes
  // ============================================

  /**
   * Create a new lead via bot
   * POST /api/bot/leads
   */
  app.post("/api/bot/leads", authenticateBotRequest, async (req, res) => {
    try {
      const { platformUserId, platform, ...leadData } = req.body;

      // Get CRM user from bot user mapping
      const mapping = await storage.getBotUserMapping(platform, platformUserId);

      if (!mapping) {
        return res.status(403).json({
          success: false,
          message:
            "User not linked. Please link your account first using /link command.",
        });
      }

      const user = await storage.getUser(mapping.crmUserId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "CRM user not found",
        });
      }

      // Handle custom sector
      const knownSectors = ['Technology', 'Manufacturing', 'Healthcare', 'Energy', 'Real Estate', 'Consumer Goods', 'Others'];
      let sector = leadData.sector;
      let customSector = undefined;

      if (leadData.sector && !knownSectors.includes(leadData.sector)) {
        customSector = leadData.sector;
        sector = 'Others';
      }

      // Handle custom transaction type
      const knownTransactionTypes = ['M&A', 'Fundraising', 'Debt Financing', 'Strategic Advisory', 'Others'];
      let transactionType = leadData.transactionType;
      let customTransactionType = undefined;

      if (leadData.transactionType && !knownTransactionTypes.includes(leadData.transactionType)) {
        customTransactionType = leadData.transactionType;
        transactionType = 'Others';
      }

      // Handle custom inbound source
      const knownInboundSources = ['Kotak Wealth', '360 Wealth', 'LGT', 'Pandion Partners', 'Others'];
      let inboundSource = leadData.inboundSource;
      let customInboundSource = undefined;

      if (leadData.sourceType === 'Inbound' &&
          leadData.inboundSource &&
          !knownInboundSources.includes(leadData.inboundSource)) {
        customInboundSource = leadData.inboundSource;
        inboundSource = 'Others';
      }

      const completeLeadData = {
        ...leadData,
        ownerId: user.id,
        assignedTo: `${user.firstName} ${user.lastName}`,
        status: 'Initial Discussion' as const,
        acceptanceStage: 'Undecided' as const,
        sector: sector as 'Technology' | 'Manufacturing' | 'Healthcare' | 'Energy' | 'Real Estate' | 'Consumer Goods' | 'Others',
        customSector,
        transactionType: transactionType as 'M&A' | 'Fundraising' | 'Debt Financing' | 'Strategic Advisory' | 'Others',
        customTransactionType,
        inboundSource: inboundSource as 'Kotak Wealth' | '360 Wealth' | 'LGT' | 'Pandion Partners' | 'Others' | undefined,
        customInboundSource,
      };

      // Validate with schema
      const validatedData = insertLeadSchema.parse(completeLeadData);

      // Create lead
      const newLead = await storage.createLead(validatedData);

      res.json({
        success: true,
        message: "Lead created successfully",
        lead: newLead,
      });
    } catch (error) {
      console.error("Create lead error:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * Get user's leads via bot
   * GET /api/bot/user-leads/:platform/:platformUserId
   */
  app.get(
    "/api/bot/user-leads/:platform/:platformUserId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.params;

        // Get CRM user from bot user mapping
        const mapping = await storage.getBotUserMapping(platform, platformUserId);

        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked",
          });
        }

        const user = await storage.getUser(mapping.crmUserId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "CRM user not found",
          });
        }

        // Get user's leads and filter out converted ones
        const leads = await storage.getLeadsByOwner(user.id, user.role);
        const activeLeads = leads.filter((l) => l.isConverted === "false");

        res.json({
          success: true,
          leads: activeLeads,
        });
      } catch (error) {
        console.error("Get user leads error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get leads",
        });
      }
    }
  );

  /**
   * Update lead fields (status, acceptance, lead, co-lead)
   * PATCH /api/bot/leads/:leadId/update
   */
  app.patch(
    "/api/bot/leads/:leadId/update",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { leadId } = req.params;
        const { platformUserId, platform, ...updateData } = req.body;

        // Verify user is linked
        const mapping = await storage.getBotUserMapping(platform, platformUserId);

        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked",
          });
        }

        // Get the lead
        const lead = await storage.getLead(leadId);

        if (!lead) {
          return res.status(404).json({
            success: false,
            message: "Lead not found",
          });
        }

        // Update the lead
        const updatedLead = await storage.updateLead(leadId, updateData);

        res.json({
          success: true,
          message: "Lead updated successfully",
          lead: updatedLead,
        });
      } catch (error) {
        console.error("Update lead error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update lead",
        });
      }
    }
  );

  /**
   * Convert lead to client via bot
   * POST /api/bot/leads/:leadId/convert
   */
  app.post(
    "/api/bot/leads/:leadId/convert",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { leadId } = req.params;
        const { platformUserId, platform } = req.body;

        // Verify user is linked
        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId,
        );

        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked",
          });
        }

        // Convert lead to client
        const result = await storage.convertLeadToClient(leadId);

        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Lead not found or already converted",
          });
        }

        res.json({
          success: true,
          message: "Lead converted to client successfully",
          client: result.client,
        });
      } catch (error) {
        console.error("Convert lead error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to convert lead",
        });
      }
    },
  );

  /**
   * Delete lead via bot
   * DELETE /api/bot/leads/:leadId
   */
  app.delete(
    "/api/bot/leads/:leadId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { leadId } = req.params;
        const { platformUserId, platform } = req.body;

        // Verify user is linked
        const mapping = await storage.getBotUserMapping(platform, platformUserId);

        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked",
          });
        }

        // Delete the lead
        const deleted = await storage.deleteLead(leadId);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            message: "Lead not found",
          });
        }

        res.json({
          success: true,
          message: "Lead deleted successfully",
        });
      } catch (error) {
        console.error("Delete lead error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to delete lead",
        });
      }
    },
  );
  /**
   * Get user's leads stats
   * GET /api/bot/stats/:platform/:platformUserId
   */
  app.get(
    "/api/bot/stats/:platform/:platformUserId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.params;

        // Get CRM user from bot user mapping
        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId,
        );

        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked",
          });
        }

        const user = await storage.getUser(mapping.crmUserId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Get user's leads
        const leads = await storage.getLeadsByOwner(user.id, user.role);

        // Calculate stats
        const stats = {
          totalLeads: leads.length,
          byStatus: {
            initialDiscussion: leads.filter(
              (l) => l.status === "Initial Discussion",
            ).length,
            nda: leads.filter((l) => l.status === "NDA").length,
            engagement: leads.filter((l) => l.status === "Engagement").length,
          },
          byAcceptance: {
            undecided: leads.filter((l) => l.acceptanceStage === "Undecided")
              .length,
            accepted: leads.filter((l) => l.acceptanceStage === "Accepted")
              .length,
            rejected: leads.filter((l) => l.acceptanceStage === "Rejected")
              .length,
          },
          converted: leads.filter((l) => l.isConverted === "true").length,
        };

        res.json({
          success: true,
          stats,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get stats",
        });
      }
    },
  );

  // GET /api/bot/user-clients/:platform/:platformUserId
  app.get("/api/bot/user-clients/:platform/:platformUserId", authenticateBotRequest, async (req, res) => {
    try {
      const { platform, platformUserId } = req.params;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const user = await storage.getUser(mapping.crmUserId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const clients = await storage.getClientsByOwner(user.id, user.role);
      res.json({ success: true, clients });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to get clients" });
    }
  });

  // PATCH /api/bot/clients/:clientId/update
  app.patch("/api/bot/clients/:clientId/update", authenticateBotRequest, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { platformUserId, platform, ...updateData } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ success: false, message: "Client not found" });
      const updatedClient = await storage.updateClient(clientId, updateData);
      res.json({ success: true, message: "Client updated successfully", client: updatedClient });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update client" });
    }
  });

  // DELETE /api/bot/clients/:clientId
  app.delete("/api/bot/clients/:clientId", authenticateBotRequest, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { platformUserId, platform } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const success = await storage.deleteClient(clientId);
      if (!success) return res.status(404).json({ success: false, message: "Client not found" });
      res.json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete client" });
    }
  });

  // POST /api/bot/leads/:leadId/notes
  app.post("/api/bot/leads/:leadId/notes", authenticateBotRequest, async (req, res) => {
    try {
      const { leadId } = req.params;
      const { platformUserId, platform, note } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const user = await storage.getUser(mapping.crmUserId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      // Notes on leads are stored via client comments on the converted client — 
      // for leads we update the lead with a note field if it exists, otherwise use a workaround
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
      const updatedLead = await storage.updateLead(leadId, { notes: note });
      res.json({ success: true, message: "Note added successfully", lead: updatedLead });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to add note" });
    }
  });

  // POST /api/bot/clients/:clientId/notes
  app.post("/api/bot/clients/:clientId/notes", authenticateBotRequest, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { platformUserId, platform, note } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const user = await storage.getUser(mapping.crmUserId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const comment = await storage.addClientComment({
        clientId,
        comment: note,
        addedBy: `${user.firstName} ${user.lastName}`,
        addedById: user.id,
      });
      res.json({ success: true, message: "Note added successfully", comment });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to add note" });
    }
  });

  // GET /api/bot/mystats/:platform/:platformUserId
  app.get("/api/bot/mystats/:platform/:platformUserId", authenticateBotRequest, async (req, res) => {
    try {
      const { platform, platformUserId } = req.params;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const user = await storage.getUser(mapping.crmUserId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const leads = await storage.getLeadsByOwner(user.id, user.role);
      const clients = await storage.getClientsByOwner(user.id, user.role);
      const activeLeads = leads.filter(l => l.isConverted === "false");
      res.json({
        success: true,
        user: { firstName: user.firstName, lastName: user.lastName },
        leads: {
          total: activeLeads.length,
          byStatus: {
            initialDiscussion: activeLeads.filter(l => l.status === "Initial Discussion").length,
            nda: activeLeads.filter(l => l.status === "NDA").length,
            engagement: activeLeads.filter(l => l.status === "Engagement").length,
          },
          byAcceptance: {
            undecided: activeLeads.filter(l => l.acceptanceStage === "Undecided").length,
            accepted: activeLeads.filter(l => l.acceptanceStage === "Accepted").length,
            rejected: activeLeads.filter(l => l.acceptanceStage === "Rejected").length,
          },
          converted: leads.filter(l => l.isConverted === "true").length,
        },
        clients: {
          total: clients.length,
          bySector: clients.reduce((acc: Record<string, number>, c) => {
            const s = c.customSector || c.sector || "Unknown";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to get stats" });
    }
  });
  // POST /api/bot/reminders
  app.post("/api/bot/reminders", authenticateBotRequest, async (req, res) => {
    try {
      const { platform, platformUserId, message, reminderAt, linkedType, linkedId } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const reminder = await storage.createReminder({
        platform,
        telegramUserId: platformUserId,
        crmUserId: mapping.crmUserId,
        message,
        reminderAt: new Date(reminderAt),
        linkedType: linkedType || null,
        linkedId: linkedId || null,
      });
      res.json({ success: true, reminder });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to create reminder" });
    }
  });
  // GET /api/bot/reminders/due (called by scheduler)
  app.get("/api/bot/reminders/due", authenticateBotRequest, async (req, res) => {
    try {
      const due = await storage.getDueReminders();
      res.json({ success: true, reminders: due });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch due reminders" });
    }
  });
  
  // GET /api/bot/reminders/:platform/:platformUserId
  app.get("/api/bot/reminders/:platform/:platformUserId", authenticateBotRequest, async (req, res) => {
    try {
      const { platform, platformUserId } = req.params;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) return res.status(403).json({ success: false, message: "User not linked" });
      const userReminders = await storage.getUserReminders(mapping.crmUserId);
      res.json({ success: true, reminders: userReminders });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch reminders" });
    }
  });

  // DELETE /api/bot/reminders/:reminderId
  app.delete("/api/bot/reminders/:reminderId", authenticateBotRequest, async (req, res) => {
    try {
      const { reminderId } = req.params;
      const success = await storage.deleteReminder(reminderId);
      if (!success) return res.status(404).json({ success: false, message: "Reminder not found" });
      res.json({ success: true, message: "Reminder cancelled" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete reminder" });
    }
  });

  // GET /api/bot/reminders/due (called by scheduler)
  app.get("/api/bot/reminders/due", authenticateBotRequest, async (req, res) => {
    try {
      const due = await storage.getDueReminders();
      res.json({ success: true, reminders: due });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch due reminders" });
    }
  });
  /**
   * Health check endpoint
   * GET /api/bot/health
   */
  app.get("/api/bot/health", authenticateBotRequest, async (req, res) => {
    res.json({
      success: true,
      message: "Bot API is running",
      timestamp: new Date().toISOString(),
    });
  });
}