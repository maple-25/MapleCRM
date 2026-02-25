var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var leadStatusEnum = pgEnum("lead_status", ["Initial Discussion", "NDA", "Engagement"]);
var clientStatusEnum = pgEnum("client_status", ["NDA Shared", "NDA Signed", "IM/Financial Model", "Investor Tracker", "Term Sheet", "Due Diligence", "Agreement", "Transaction closed", "Client Dropped"]);
var projectStatusEnum = pgEnum("project_status", ["planning", "in_progress", "on_hold", "completed", "cancelled"]);
var projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high", "urgent"]);
var commentTypeEnum = pgEnum("comment_type", ["update", "change", "feedback"]);
var userRoleEnum = pgEnum("user_role", ["admin", "user"]);
var sectorEnum = pgEnum("sector", ["Technology", "Manufacturing", "Healthcare", "Energy", "Real Estate", "Consumer Goods", "Others"]);
var transactionTypeEnum = pgEnum("transaction_type", ["M&A", "Fundraising", "Debt Financing", "Strategic Advisory", "Others"]);
var sourceTypeEnum = pgEnum("source_type", ["Inbound", "Outbound"]);
var inboundSourceEnum = pgEnum("inbound_source", ["Kotak Wealth", "360 Wealth", "LGT", "Pandion Partners", "Others"]);
var acceptanceStageEnum = pgEnum("acceptance_stage", ["Undecided", "Accepted", "Rejected"]);
var assignedToEnum = pgEnum("assigned_to", ["Pankaj Karna", "Nitin Gupta", "Abhinav Grover", "Manish Johari", "Aakash Jain", "Ojasva Chugh", "Ujjwal Jha", "Devapi Singh"]);
var leadAssignmentEnum = pgEnum("lead_assignment", ["Pankaj Karna", "Nitin Gupta", "Aakash Jain", "Ojasva Chugh", "Ujjwal Jha", "Devapi Singh"]);
var teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  isActive: text("is_active").notNull().default("true"),
  position: text("position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var fundTracker = pgTable("fund_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fundName: text("fund_name").notNull(),
  website: text("website"),
  fundType: text("fund_type"),
  stages: text("stages").array(),
  source: text("source"),
  contactPerson1: text("contact_person_1").notNull(),
  designation1: text("designation_1").notNull(),
  email1: text("email_1").notNull(),
  phone1: text("phone_1"),
  contactPerson2: text("contact_person_2"),
  designation2: text("designation_2"),
  email2: text("email_2"),
  phone2: text("phone_2"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow()
});
var partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0.00"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow()
});
var leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  sector: sectorEnum("sector").notNull(),
  customSector: text("custom_sector"),
  // For when "Others" is selected
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  customTransactionType: text("custom_transaction_type"),
  // For when "Others" is selected
  clientPoc: text("client_poc").notNull(),
  phoneNumber: text("phone_number"),
  emailId: text("email_id").notNull(),
  firstContacted: timestamp("first_contacted"),
  lastContacted: timestamp("last_contacted"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  inboundSource: inboundSourceEnum("inbound_source"),
  // For inbound leads
  customInboundSource: text("custom_inbound_source"),
  // For inbound "Others"
  outboundSource: text("outbound_source"),
  // For outbound leads
  acceptanceStage: acceptanceStageEnum("acceptance_stage").notNull().default("Undecided"),
  status: leadStatusEnum("status").notNull().default("Initial Discussion"),
  assignedTo: text("assigned_to").notNull(),
  leadAssignment: leadAssignmentEnum("lead_assignment"),
  coLeadAssignment: leadAssignmentEnum("co_lead_assignment"),
  isConverted: text("is_converted").default("false"),
  // For lead to client conversion
  convertedClientId: varchar("converted_client_id").references(() => clients.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  sector: sectorEnum("sector").notNull(),
  customSector: text("custom_sector"),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  customTransactionType: text("custom_transaction_type"),
  clientPoc: text("client_poc").notNull(),
  phoneNumber: text("phone_number"),
  emailId: text("email_id").notNull(),
  lastContacted: timestamp("last_contacted"),
  status: clientStatusEnum("status").notNull().default("NDA Shared"),
  assignedTo: text("assigned_to").notNull(),
  leadAssignment: leadAssignmentEnum("lead_assignment"),
  coLeadAssignment: leadAssignmentEnum("co_lead_assignment"),
  controlSheetLink: text("control_sheet_link"),
  convertedFromLeadId: varchar("converted_from_lead_id"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  clientId: varchar("client_id").references(() => clients.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var projectComments = pgTable("project_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentCommentId: varchar("parent_comment_id").references(() => projectComments.id),
  commentType: commentTypeEnum("comment_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  canEdit: text("can_edit").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow()
});
var clientComments = pgTable("client_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentCommentId: varchar("parent_comment_id").references(() => clientComments.id),
  commentType: commentTypeEnum("comment_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var clientMasterData = pgTable("client_master_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  designation: text("designation"),
  company: text("company"),
  industry: text("industry"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  addedBy: varchar("added_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var userMasterDataPermissions = pgTable("user_master_data_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  hasViewAccess: text("has_view_access").notNull().default("false"),
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true
});
var insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  firstContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  lastContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable()
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  lastContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable()
});
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startDate: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  dueDate: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable()
});
var insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true
}).extend({
  parentCommentId: z.string().optional()
});
var insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true
});
var insertClientCommentSchema = createInsertSchema(clientComments).omit({
  id: true,
  createdAt: true
}).extend({
  parentCommentId: z.string().optional()
});
var insertFundTrackerSchema = createInsertSchema(fundTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientMasterDataSchema = createInsertSchema(clientMasterData).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserMasterDataPermissionSchema = createInsertSchema(userMasterDataPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  requestedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  approvedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable()
});
var outreachStatusEnum = pgEnum("outreach_status", ["draft", "scheduled", "sent", "failed", "bounced", "opened", "replied"]);
var outreachSourceEnum = pgEnum("outreach_source", ["fund_tracker", "client_master_data", "manual"]);
var outreachCampaigns = pgTable("outreach_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var outreachEmails = pgTable("outreach_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => outreachCampaigns.id),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientCompany: text("recipient_company"),
  recipientDesignation: text("recipient_designation"),
  source: outreachSourceEnum("source").notNull().default("manual"),
  sourceId: varchar("source_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: outreachStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
  errorMessage: text("error_message"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertOutreachCampaignSchema = createInsertSchema(outreachCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOutreachEmailSchema = createInsertSchema(outreachEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  sentAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  openedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  repliedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable()
});
var botUserMappings = pgTable("bot_user_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform").notNull(),
  // 'telegram' or 'whatsapp'
  platformUserId: text("platform_user_id").notNull(),
  // Telegram user ID (e.g., "123456789")
  platformUsername: text("platform_username"),
  // @username (optional)
  crmUserId: varchar("crm_user_id").notNull().references(() => users.id),
  linkedAt: timestamp("linked_at").defaultNow(),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertBotUserMappingSchema = createInsertSchema(botUserMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  linkedAt: true
});

// server/storage.ts
import { eq, sql as sql2, desc, and, or, ne, isNotNull } from "drizzle-orm";
var DatabaseStorage = class {
  db;
  constructor() {
    const sql_conn = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      connect_timeout: 10
    });
    this.db = drizzle(sql_conn);
  }
  // Users
  async getUser(id) {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByEmail(email) {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async getAllUsers() {
    return await this.db.select().from(users);
  }
  async createUser(insertUser) {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async updateUser(id, userUpdate) {
    const result = await this.db.update(users).set(userUpdate).where(eq(users.id, id)).returning();
    return result[0];
  }
  async deleteUser(id) {
    try {
      const result = await this.db.delete(users).where(eq(users.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  // Partners
  async getAllPartners() {
    return await this.db.select().from(partners);
  }
  async getPartner(id) {
    const result = await this.db.select().from(partners).where(eq(partners.id, id)).limit(1);
    return result[0];
  }
  async createPartner(insertPartner) {
    const result = await this.db.insert(partners).values(insertPartner).returning();
    return result[0];
  }
  // Leads
  async getAllLeads() {
    return await this.db.select().from(leads);
  }
  async getLeadsByOwner(userId, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(leads).where(ne(leads.acceptanceStage, "Rejected")).orderBy(desc(leads.updatedAt));
    } else {
      const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
      const userFirstName = user[0]?.firstName;
      if (userFirstName) {
        const userFullNames = [
          "Pankaj Karna",
          "Nitin Gupta",
          "Aakash Jain",
          "Ojasva Chugh",
          "Ujjwal Jha",
          "Devapi Singh"
        ];
        const matchingName = userFullNames.find(
          (name) => name.toLowerCase().startsWith(userFirstName.toLowerCase())
        );
        if (matchingName) {
          const ownedLeads = await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, "Rejected"))).orderBy(desc(leads.updatedAt));
          const assignedLeads = await this.db.select().from(leads).where(and(
            ne(leads.acceptanceStage, "Rejected"),
            or(
              eq(leads.leadAssignment, matchingName),
              eq(leads.coLeadAssignment, matchingName)
            )
          )).orderBy(desc(leads.updatedAt));
          const allLeads = [...ownedLeads, ...assignedLeads];
          const uniqueLeads = allLeads.filter(
            (lead, index, arr) => arr.findIndex((l) => l.id === lead.id) === index
          );
          return uniqueLeads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
      return await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, "Rejected"))).orderBy(desc(leads.updatedAt));
    }
  }
  async getColdLeadsByOwner(userId, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(leads).where(eq(leads.acceptanceStage, "Rejected"));
    } else {
      return await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), eq(leads.acceptanceStage, "Rejected")));
    }
  }
  async getLead(id) {
    const result = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0];
  }
  async createLead(insertLead) {
    const result = await this.db.insert(leads).values(insertLead).returning();
    return result[0];
  }
  async updateLead(id, leadUpdate) {
    const result = await this.db.update(leads).set({ ...leadUpdate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leads.id, id)).returning();
    return result[0];
  }
  async deleteLead(id) {
    try {
      const existingLead = await this.getLead(id);
      if (!existingLead) {
        return false;
      }
      if (existingLead.convertedClientId) {
        await this.db.update(leads).set({ convertedClientId: null }).where(eq(leads.id, id));
        await this.db.delete(clients).where(eq(clients.id, existingLead.convertedClientId));
      }
      await this.db.delete(leads).where(eq(leads.id, id));
      const deletedLead = await this.getLead(id);
      return !deletedLead;
    } catch (error) {
      console.error("Error deleting lead:", error);
      return false;
    }
  }
  async convertLeadToClient(leadId) {
    const lead = await this.getLead(leadId);
    if (!lead) return void 0;
    const clientData = {
      companyName: lead.companyName,
      sector: lead.sector,
      customSector: lead.customSector,
      transactionType: lead.transactionType,
      customTransactionType: lead.customTransactionType,
      clientPoc: lead.clientPoc,
      phoneNumber: lead.phoneNumber,
      emailId: lead.emailId,
      lastContacted: lead.lastContacted,
      status: "NDA Shared",
      assignedTo: lead.assignedTo,
      leadAssignment: lead.leadAssignment || null,
      coLeadAssignment: lead.coLeadAssignment || null,
      convertedFromLeadId: leadId,
      ownerId: lead.ownerId,
      notes: lead.notes || `Copied from lead on ${(/* @__PURE__ */ new Date()).toISOString()}`
    };
    const client = await this.createClient(clientData);
    const updatedLead = await this.updateLead(leadId, {
      isConverted: "true",
      convertedClientId: client.id
    });
    return { lead: updatedLead, client };
  }
  // Clients
  async getAllClients() {
    return await this.db.select().from(clients);
  }
  async getClientsByOwner(userId, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(clients).where(and(
        ne(clients.status, "Transaction closed"),
        ne(clients.status, "Client Dropped")
      )).orderBy(desc(clients.updatedAt));
    } else {
      const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
      const userFirstName = user[0]?.firstName;
      if (userFirstName) {
        const userFullNames = [
          "Pankaj Karna",
          "Nitin Gupta",
          "Aakash Jain",
          "Ojasva Chugh",
          "Ujjwal Jha",
          "Devapi Singh"
        ];
        const matchingName = userFullNames.find(
          (name) => name.toLowerCase().startsWith(userFirstName.toLowerCase())
        );
        if (matchingName) {
          const ownedClients = await this.db.select().from(clients).where(and(
            eq(clients.ownerId, userId),
            ne(clients.status, "Transaction closed"),
            ne(clients.status, "Client Dropped")
          )).orderBy(desc(clients.updatedAt));
          const assignedClients = await this.db.select().from(clients).where(and(
            or(
              eq(clients.leadAssignment, matchingName),
              eq(clients.coLeadAssignment, matchingName)
            ),
            ne(clients.status, "Transaction closed"),
            ne(clients.status, "Client Dropped")
          )).orderBy(desc(clients.updatedAt));
          const allClients = [...ownedClients, ...assignedClients];
          const uniqueClients = allClients.filter(
            (client, index, arr) => arr.findIndex((c) => c.id === client.id) === index
          );
          return uniqueClients.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
      return await this.db.select().from(clients).where(and(
        eq(clients.ownerId, userId),
        ne(clients.status, "Transaction closed"),
        ne(clients.status, "Client Dropped")
      )).orderBy(desc(clients.updatedAt));
    }
  }
  async getPastClientsByOwner(userId, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(clients).where(
        or(eq(clients.status, "Transaction closed"), eq(clients.status, "Client Dropped"))
      );
    } else {
      return await this.db.select().from(clients).where(and(
        eq(clients.ownerId, userId),
        or(eq(clients.status, "Transaction closed"), eq(clients.status, "Client Dropped"))
      ));
    }
  }
  async getRecentClientsByOwner(userId, userRole, limit = 5) {
    if (userRole === "admin") {
      return await this.db.select().from(clients).orderBy(desc(clients.createdAt)).limit(limit);
    } else {
      return await this.db.select().from(clients).where(eq(clients.ownerId, userId)).orderBy(desc(clients.createdAt)).limit(limit);
    }
  }
  async getClient(id) {
    const result = await this.db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }
  async createClient(insertClient) {
    const result = await this.db.insert(clients).values(insertClient).returning();
    return result[0];
  }
  async updateClient(id, clientUpdate) {
    const result = await this.db.update(clients).set({ ...clientUpdate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clients.id, id)).returning();
    return result[0];
  }
  async deleteClient(id) {
    try {
      const existingClient = await this.getClient(id);
      if (!existingClient) {
        return false;
      }
      await this.db.update(leads).set({ convertedClientId: null }).where(eq(leads.convertedClientId, id));
      await this.db.delete(clients).where(eq(clients.id, id));
      const deletedClient = await this.getClient(id);
      return !deletedClient;
    } catch (error) {
      console.error("Error deleting client:", error);
      return false;
    }
  }
  // Project Comments
  async getProjectComments(projectId) {
    const result = await this.db.select({
      id: projectComments.id,
      projectId: projectComments.projectId,
      userId: projectComments.userId,
      parentCommentId: projectComments.parentCommentId,
      commentType: projectComments.commentType,
      content: projectComments.content,
      createdAt: projectComments.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email
    }).from(projectComments).leftJoin(users, eq(projectComments.userId, users.id)).where(eq(projectComments.projectId, projectId)).orderBy(projectComments.createdAt);
    const flatComments = result.map((comment) => ({
      ...comment,
      userName: comment.userFirstName && comment.userLastName ? `${comment.userFirstName} ${comment.userLastName}` : "Unknown User",
      replies: []
    }));
    const topLevelComments = flatComments.filter((comment) => !comment.parentCommentId);
    const replyComments = flatComments.filter((comment) => comment.parentCommentId);
    replyComments.forEach((reply) => {
      const parentComment = topLevelComments.find((comment) => comment.id === reply.parentCommentId);
      if (parentComment) {
        parentComment.replies.push(reply);
      }
    });
    return topLevelComments;
  }
  async createProjectComment(comment) {
    const result = await this.db.insert(projectComments).values(comment).returning();
    return result[0];
  }
  async addProjectComment(comment) {
    return await this.createProjectComment(comment);
  }
  async deleteProjectComment(commentId) {
    try {
      await this.db.delete(projectComments).where(eq(projectComments.id, commentId));
      return true;
    } catch (error) {
      console.error("Error deleting comment:", error);
      return false;
    }
  }
  // Partner-specific leads (for affiliate tabs)
  async getLeadsByInboundSource(source) {
    return await this.db.select().from(leads).where(eq(leads.inboundSource, source));
  }
  // Projects
  async getAllProjects() {
    return await this.db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      priority: projects.priority,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      ownerName: sql2`${users.firstName} || ' ' || ${users.lastName}`,
      ownerEmail: users.email
    }).from(projects).leftJoin(users, eq(projects.ownerId, users.id));
  }
  async getProjectsForUser(userId, userRole) {
    if (userRole === "admin") {
      return await this.getAllProjects();
    } else {
      return await this.db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        clientId: projects.clientId,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        ownerName: sql2`${users.firstName} || ' ' || ${users.lastName}`,
        ownerEmail: users.email
      }).from(projects).leftJoin(users, eq(projects.ownerId, users.id)).where(eq(projects.ownerId, userId));
    }
  }
  async getProject(id) {
    const result = await this.db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      priority: projects.priority,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt
    }).from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }
  async createProject(insertProject) {
    const result = await this.db.insert(projects).values(insertProject).returning();
    return result[0];
  }
  async updateProject(id, projectUpdate) {
    const result = await this.db.update(projects).set({ ...projectUpdate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, id)).returning();
    return result[0];
  }
  async getProjectsByOwner(ownerId) {
    return await this.db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt
    }).from(projects).where(eq(projects.ownerId, ownerId));
  }
  async deleteProject(id) {
    try {
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        return false;
      }
      await this.db.delete(projectComments).where(eq(projectComments.projectId, id));
      await this.db.delete(projectMembers).where(eq(projectMembers.projectId, id));
      await this.db.delete(projects).where(eq(projects.id, id));
      const deletedProject = await this.getProject(id);
      return !deletedProject;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }
  // Project Members
  async getProjectMembers(projectId) {
    return await this.db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  }
  async addProjectMember(insertMember) {
    const result = await this.db.insert(projectMembers).values(insertMember).returning();
    return result[0];
  }
  // Dashboard stats
  async getDashboardStats(userId, userRole) {
    try {
      let totalLeads, activeClients;
      if (userRole === "admin") {
        totalLeads = await this.db.select().from(leads).where(ne(leads.acceptanceStage, "Rejected"));
        activeClients = await this.db.select().from(clients).where(and(
          ne(clients.status, "Transaction closed"),
          ne(clients.status, "Client Dropped")
        ));
      } else {
        const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
        const userFirstName = user[0]?.firstName;
        if (userFirstName) {
          const userFullNames = [
            "Pankaj Karna",
            "Nitin Gupta",
            "Aakash Jain",
            "Ojasva Chugh",
            "Ujjwal Jha",
            "Devapi Singh"
          ];
          const matchingName = userFullNames.find(
            (name) => name.toLowerCase().startsWith(userFirstName.toLowerCase())
          );
          if (matchingName) {
            const ownedLeads = await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, "Rejected")));
            const assignedLeads = await this.db.select().from(leads).where(and(
              ne(leads.acceptanceStage, "Rejected"),
              or(
                eq(leads.leadAssignment, matchingName),
                eq(leads.coLeadAssignment, matchingName)
              )
            ));
            const allLeads = [...ownedLeads, ...assignedLeads];
            const uniqueLeads = allLeads.filter(
              (lead, index, arr) => arr.findIndex((l) => l.id === lead.id) === index
            );
            totalLeads = uniqueLeads;
            const ownedClients = await this.db.select().from(clients).where(and(
              eq(clients.ownerId, userId),
              ne(clients.status, "Transaction closed"),
              ne(clients.status, "Client Dropped")
            ));
            const assignedClients = await this.db.select().from(clients).where(and(
              or(
                eq(clients.leadAssignment, matchingName),
                eq(clients.coLeadAssignment, matchingName)
              ),
              ne(clients.status, "Transaction closed"),
              ne(clients.status, "Client Dropped")
            ));
            const allClients = [...ownedClients, ...assignedClients];
            const uniqueClients = allClients.filter(
              (client, index, arr) => arr.findIndex((c) => c.id === client.id) === index
            );
            activeClients = uniqueClients;
          } else {
            totalLeads = await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, "Rejected")));
            activeClients = await this.db.select().from(clients).where(and(
              eq(clients.ownerId, userId),
              ne(clients.status, "Transaction closed"),
              ne(clients.status, "Client Dropped")
            ));
          }
        } else {
          totalLeads = await this.db.select().from(leads).where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, "Rejected")));
          activeClients = await this.db.select().from(clients).where(and(
            eq(clients.ownerId, userId),
            ne(clients.status, "Transaction closed"),
            ne(clients.status, "Client Dropped")
          ));
        }
      }
      let userProjects;
      if (userRole === "admin") {
        userProjects = await this.db.select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          startDate: projects.startDate,
          dueDate: projects.dueDate,
          clientId: projects.clientId,
          ownerId: projects.ownerId,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt
        }).from(projects);
      } else {
        userProjects = await this.db.select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          startDate: projects.startDate,
          dueDate: projects.dueDate,
          clientId: projects.clientId,
          ownerId: projects.ownerId,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt
        }).from(projects).where(eq(projects.ownerId, userId));
      }
      console.log(`Dashboard stats for ${userRole} ${userId}: found ${userProjects.length} total projects`);
      const activeProjects = userProjects.filter(
        (p) => p.status === "planning" || p.status === "in_progress" || p.status === "on_hold"
      );
      return {
        totalLeads: totalLeads.length,
        activeClients: activeClients.length,
        activeProjects: activeProjects.length
      };
    } catch (error) {
      console.error("Dashboard stats error in storage:", error);
      throw error;
    }
  }
  // Client Comments methods
  async getClientComments(clientId) {
    const result = await this.db.select({
      id: clientComments.id,
      clientId: clientComments.clientId,
      userId: clientComments.userId,
      parentCommentId: clientComments.parentCommentId,
      commentType: clientComments.commentType,
      content: clientComments.content,
      createdAt: clientComments.createdAt,
      userName: sql2`${users.firstName} || ' ' || ${users.lastName}`,
      userEmail: users.email
    }).from(clientComments).leftJoin(users, eq(clientComments.userId, users.id)).where(eq(clientComments.clientId, clientId)).orderBy(clientComments.createdAt);
    const flatComments = result.map((comment) => ({
      ...comment,
      replies: []
    }));
    const topLevelComments = flatComments.filter((comment) => !comment.parentCommentId);
    const replyComments = flatComments.filter((comment) => comment.parentCommentId);
    replyComments.forEach((reply) => {
      const parentComment = topLevelComments.find((comment) => comment.id === reply.parentCommentId);
      if (parentComment) {
        parentComment.replies.push(reply);
      }
    });
    return topLevelComments;
  }
  async addClientComment(comment) {
    const result = await this.db.insert(clientComments).values(comment).returning();
    return result[0];
  }
  async deleteClientComment(commentId) {
    try {
      const result = await this.db.delete(clientComments).where(eq(clientComments.id, commentId));
      return true;
    } catch (error) {
      console.error("Error deleting client comment:", error);
      return false;
    }
  }
  // Missing interface methods for Lead/Co-Lead assignment filtering
  async getLeadsByLeadAssignment(assigneeName, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(leads).where(
        or(
          eq(leads.leadAssignment, assigneeName),
          eq(leads.coLeadAssignment, assigneeName)
        )
      );
    } else {
      return await this.db.select().from(leads).where(
        and(
          eq(leads.ownerId, assigneeName),
          or(
            eq(leads.leadAssignment, assigneeName),
            eq(leads.coLeadAssignment, assigneeName)
          )
        )
      );
    }
  }
  async getClientsByLeadAssignment(assigneeName, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(clients).where(
        or(
          eq(clients.leadAssignment, assigneeName),
          eq(clients.coLeadAssignment, assigneeName)
        )
      );
    } else {
      return await this.db.select().from(clients).where(
        and(
          eq(clients.ownerId, assigneeName),
          or(
            eq(clients.leadAssignment, assigneeName),
            eq(clients.coLeadAssignment, assigneeName)
          )
        )
      );
    }
  }
  // Fund Tracker methods
  async getAllFunds() {
    return await this.db.select().from(fundTracker).orderBy(desc(fundTracker.createdAt));
  }
  async getFund(id) {
    const result = await this.db.select().from(fundTracker).where(eq(fundTracker.id, id)).limit(1);
    return result[0];
  }
  async createFund(insertFund) {
    const result = await this.db.insert(fundTracker).values(insertFund).returning();
    return result[0];
  }
  async bulkCreateFunds(funds) {
    if (funds.length === 0) return [];
    const result = await this.db.insert(fundTracker).values(funds).returning();
    return result;
  }
  async updateFund(id, fundUpdate) {
    const result = await this.db.update(fundTracker).set(fundUpdate).where(eq(fundTracker.id, id)).returning();
    return result[0];
  }
  async deleteFund(id) {
    try {
      const result = await this.db.delete(fundTracker).where(eq(fundTracker.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting fund:", error);
      return false;
    }
  }
  // Team Members methods
  async getAllTeamMembers() {
    return await this.db.select().from(teamMembers).orderBy(teamMembers.name);
  }
  async getActiveTeamMembers() {
    return await this.db.select().from(teamMembers).where(eq(teamMembers.isActive, "true")).orderBy(teamMembers.name);
  }
  async getTeamMember(id) {
    const result = await this.db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return result[0];
  }
  async createTeamMember(member) {
    const result = await this.db.insert(teamMembers).values(member).returning();
    return result[0];
  }
  async updateTeamMember(id, memberUpdate) {
    const result = await this.db.update(teamMembers).set({ ...memberUpdate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(teamMembers.id, id)).returning();
    return result[0];
  }
  async deleteTeamMember(id) {
    try {
      const result = await this.db.delete(teamMembers).where(eq(teamMembers.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting team member:", error);
      return false;
    }
  }
  // Client Master Data methods
  async getAllClientMasterData(userId, userRole) {
    if (userRole === "admin") {
      return await this.db.select().from(clientMasterData).orderBy(clientMasterData.name);
    }
    const permission = await this.getUserMasterDataPermission(userId);
    if (permission?.hasViewAccess === "true") {
      return await this.db.select().from(clientMasterData).orderBy(clientMasterData.name);
    }
    return [];
  }
  async getClientMasterData(id) {
    const result = await this.db.select().from(clientMasterData).where(eq(clientMasterData.id, id)).limit(1);
    return result[0];
  }
  async createClientMasterData(data) {
    const result = await this.db.insert(clientMasterData).values(data).returning();
    return result[0];
  }
  async updateClientMasterData(id, data) {
    const result = await this.db.update(clientMasterData).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clientMasterData.id, id)).returning();
    return result[0];
  }
  async deleteClientMasterData(id) {
    try {
      const result = await this.db.delete(clientMasterData).where(eq(clientMasterData.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting client master data:", error);
      return false;
    }
  }
  // User Master Data Permissions methods
  async getUserMasterDataPermission(userId) {
    const result = await this.db.select().from(userMasterDataPermissions).where(eq(userMasterDataPermissions.userId, userId)).limit(1);
    return result[0];
  }
  async createPermissionRequest(userId) {
    const existing = await this.getUserMasterDataPermission(userId);
    if (existing) {
      const result2 = await this.db.update(userMasterDataPermissions).set({ requestedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(userMasterDataPermissions.userId, userId)).returning();
      return result2[0];
    }
    const result = await this.db.insert(userMasterDataPermissions).values({
      userId,
      hasViewAccess: "false",
      requestedAt: /* @__PURE__ */ new Date()
    }).returning();
    return result[0];
  }
  async approvePermissionRequest(userId, approvedBy) {
    const result = await this.db.update(userMasterDataPermissions).set({
      hasViewAccess: "true",
      approvedAt: /* @__PURE__ */ new Date(),
      approvedBy,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(userMasterDataPermissions.userId, userId)).returning();
    return result[0];
  }
  async revokePermission(userId) {
    try {
      const result = await this.db.update(userMasterDataPermissions).set({
        hasViewAccess: "false",
        approvedAt: null,
        approvedBy: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(userMasterDataPermissions.userId, userId));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error revoking permission:", error);
      return false;
    }
  }
  async getPendingPermissionRequests() {
    return await this.db.select().from(userMasterDataPermissions).where(and(
      eq(userMasterDataPermissions.hasViewAccess, "false"),
      isNotNull(userMasterDataPermissions.requestedAt)
    )).orderBy(desc(userMasterDataPermissions.requestedAt));
  }
  async getApprovedPermissions() {
    return await this.db.select().from(userMasterDataPermissions).where(eq(userMasterDataPermissions.hasViewAccess, "true")).orderBy(desc(userMasterDataPermissions.approvedAt));
  }
  // Outreach Campaigns methods
  async getAllOutreachCampaigns(userId) {
    return await this.db.select().from(outreachCampaigns).where(eq(outreachCampaigns.createdBy, userId)).orderBy(desc(outreachCampaigns.createdAt));
  }
  async getOutreachCampaign(id) {
    const result = await this.db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, id)).limit(1);
    return result[0];
  }
  async createOutreachCampaign(campaign) {
    const result = await this.db.insert(outreachCampaigns).values(campaign).returning();
    return result[0];
  }
  async updateOutreachCampaign(id, campaign) {
    const result = await this.db.update(outreachCampaigns).set({ ...campaign, updatedAt: /* @__PURE__ */ new Date() }).where(eq(outreachCampaigns.id, id)).returning();
    return result[0];
  }
  async deleteOutreachCampaign(id) {
    try {
      const result = await this.db.delete(outreachCampaigns).where(eq(outreachCampaigns.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting outreach campaign:", error);
      return false;
    }
  }
  // Outreach Emails methods
  async getAllOutreachEmails(userId) {
    return await this.db.select().from(outreachEmails).where(eq(outreachEmails.createdBy, userId)).orderBy(desc(outreachEmails.createdAt));
  }
  async getOutreachEmailsByCampaign(campaignId) {
    return await this.db.select().from(outreachEmails).where(eq(outreachEmails.campaignId, campaignId)).orderBy(desc(outreachEmails.createdAt));
  }
  async getOutreachEmail(id) {
    const result = await this.db.select().from(outreachEmails).where(eq(outreachEmails.id, id)).limit(1);
    return result[0];
  }
  async createOutreachEmail(email) {
    const result = await this.db.insert(outreachEmails).values(email).returning();
    return result[0];
  }
  async bulkCreateOutreachEmails(emails) {
    if (emails.length === 0) return [];
    const result = await this.db.insert(outreachEmails).values(emails).returning();
    return result;
  }
  async updateOutreachEmail(id, email) {
    const result = await this.db.update(outreachEmails).set({ ...email, updatedAt: /* @__PURE__ */ new Date() }).where(eq(outreachEmails.id, id)).returning();
    return result[0];
  }
  async deleteOutreachEmail(id) {
    try {
      const result = await this.db.delete(outreachEmails).where(eq(outreachEmails.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error("Error deleting outreach email:", error);
      return false;
    }
  }
  // Bot User Mappings
  async getBotUserMapping(platform, platformUserId) {
    const result = await this.db.select().from(botUserMappings).where(and(eq(botUserMappings.platform, platform), eq(botUserMappings.platformUserId, platformUserId))).limit(1);
    return result[0];
  }
  async createBotUserMapping(data) {
    const result = await this.db.insert(botUserMappings).values(data).returning();
    return result[0];
  }
  async updateBotUserMapping(platform, platformUserId, data) {
    const result = await this.db.update(botUserMappings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(botUserMappings.platform, platform), eq(botUserMappings.platformUserId, platformUserId))).returning();
    return result[0];
  }
  async deactivateBotUserMapping(platform, platformUserId) {
    try {
      await this.db.update(botUserMappings).set({ isActive: "false", updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(botUserMappings.platform, platform), eq(botUserMappings.platformUserId, platformUserId)));
      return true;
    } catch (error) {
      console.error("Error deactivating bot user mapping:", error);
      return false;
    }
  }
  async getAllBotUserMappings(platform) {
    if (platform) {
      return await this.db.select().from(botUserMappings).where(eq(botUserMappings.platform, platform));
    }
    return await this.db.select().from(botUserMappings);
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z as z2 } from "zod";
import * as XLSX from "xlsx";
async function registerRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.getUserByUsername(email);
      }
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({ user: { ...user, password: void 0 } });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/change-password", async (req, res) => {
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
  app2.get("/api/users", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const safeUsers = users2.map((user) => ({ ...user, password: void 0 }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const newUser = await storage.createUser(userData);
      res.status(201).json({ ...newUser, password: void 0 });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
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
  app2.get("/api/partners", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      if (userRole === "admin") {
        const partners2 = await storage.getAllPartners();
        res.json(partners2);
      } else {
        const partners2 = await storage.getAllPartners();
        res.json(partners2);
      }
    } catch (error) {
      console.error("Partners error:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });
  app2.post("/api/partners", async (req, res) => {
    try {
      const partner = insertPartnerSchema.parse(req.body);
      const newPartner = await storage.createPartner(partner);
      res.status(201).json(newPartner);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create partner" });
      }
    }
  });
  app2.get("/api/leads", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const leads2 = await storage.getLeadsByOwner(userId, userRole);
      res.json(leads2);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });
  app2.get("/api/leads/cold", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const coldLeads = await storage.getColdLeadsByOwner(userId, userRole);
      res.json(coldLeads);
    } catch (error) {
      console.error("Failed to fetch cold leads:", error);
      res.status(500).json({ message: "Failed to fetch cold leads" });
    }
  });
  app2.post("/api/leads", async (req, res) => {
    try {
      const { convertToClient, ...leadData } = req.body;
      console.log("Received lead data:", leadData);
      if (leadData.sourceType === "Outbound") {
        leadData.inboundSource = null;
        leadData.customInboundSource = null;
      } else if (leadData.sourceType === "Inbound") {
        leadData.outboundSource = null;
      }
      if (leadData.inboundSource === "") leadData.inboundSource = null;
      if (leadData.customInboundSource === "") leadData.customInboundSource = null;
      if (leadData.outboundSource === "") leadData.outboundSource = null;
      if (leadData.leadAssignment === "") leadData.leadAssignment = null;
      if (leadData.coLeadAssignment === "") leadData.coLeadAssignment = null;
      const lead = insertLeadSchema.parse(leadData);
      console.log("Parsed lead data:", lead);
      const newLead = await storage.createLead(lead);
      console.log("Created lead:", newLead);
      let client = null;
      if (convertToClient) {
        const conversion = await storage.convertLeadToClient(newLead.id);
        client = conversion?.client;
      }
      res.status(201).json({ lead: newLead, client });
    } catch (error) {
      console.error("Lead creation error:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create lead", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
  app2.patch("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating lead:", id, "with data:", req.body);
      const updateData = { ...req.body };
      if (updateData.firstContacted && typeof updateData.firstContacted === "string") {
        updateData.firstContacted = new Date(updateData.firstContacted);
      }
      if (updateData.lastContacted && typeof updateData.lastContacted === "string") {
        updateData.lastContacted = new Date(updateData.lastContacted);
      }
      if (updateData.sourceType === "Outbound") {
        updateData.inboundSource = null;
        updateData.customInboundSource = null;
      } else if (updateData.sourceType === "Inbound") {
        updateData.outboundSource = null;
      }
      if (updateData.inboundSource === "") updateData.inboundSource = null;
      if (updateData.customInboundSource === "") updateData.customInboundSource = null;
      if (updateData.outboundSource === "") updateData.outboundSource = null;
      if (updateData.leadAssignment === "") updateData.leadAssignment = null;
      if (updateData.coLeadAssignment === "") updateData.coLeadAssignment = null;
      const updatedLead = await storage.updateLead(id, updateData);
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(updatedLead);
    } catch (error) {
      console.error("Lead update error:", error);
      res.status(500).json({ message: "Failed to update lead", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Deleting lead:", id);
      const success = await storage.deleteLead(id);
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Delete lead error:", error);
      res.status(500).json({ message: "Failed to delete lead", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/leads/:id/convert-to-client", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.convertLeadToClient(id);
      if (!result) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error converting lead to client:", error);
      res.status(500).json({ error: "Failed to convert lead to client" });
    }
  });
  app2.get("/api/leads/by-assignment", async (req, res) => {
    try {
      const { assigneeName, userRole } = req.query;
      if (!assigneeName || !userRole) {
        return res.status(400).json({ message: "Assignee name and user role are required" });
      }
      const leads2 = await storage.getLeadsByLeadAssignment(assigneeName, userRole);
      res.json(leads2);
    } catch (error) {
      console.error("Failed to fetch leads by assignment:", error);
      res.status(500).json({ message: "Failed to fetch leads by assignment" });
    }
  });
  app2.get("/api/clients", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const clients2 = await storage.getClientsByOwner(userId, userRole);
      res.json(clients2);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app2.get("/api/clients/past", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const pastClients = await storage.getPastClientsByOwner(userId, userRole);
      res.json(pastClients);
    } catch (error) {
      console.error("Failed to fetch past clients:", error);
      res.status(500).json({ message: "Failed to fetch past clients" });
    }
  });
  app2.get("/api/clients/recent", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const recentClients = await storage.getRecentClientsByOwner(userId, userRole, 5);
      res.json(recentClients);
    } catch (error) {
      console.error("Failed to fetch recent clients:", error);
      res.status(500).json({ message: "Failed to fetch recent clients" });
    }
  });
  app2.post("/api/clients", async (req, res) => {
    try {
      const client = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(client);
      res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create client" });
      }
    }
  });
  app2.patch("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating client:", id, "with data:", req.body);
      const updateData = { ...req.body };
      if (updateData.lastContacted && typeof updateData.lastContacted === "string") {
        updateData.lastContacted = new Date(updateData.lastContacted);
      }
      if (updateData.leadAssignment === "") updateData.leadAssignment = null;
      if (updateData.coLeadAssignment === "") updateData.coLeadAssignment = null;
      const updatedClient = await storage.updateClient(id, updateData);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.error("Client update error:", error);
      res.status(500).json({ message: "Failed to update client", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Deleting client:", id);
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ message: "Failed to delete client", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/clients/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getClientComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Get client comments error:", error);
      res.status(500).json({ message: "Failed to fetch client comments" });
    }
  });
  app2.post("/api/clients/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Adding comment to client:", id, "data:", req.body);
      const commentData = {
        ...req.body,
        clientId: id
      };
      const newComment = await storage.addClientComment(commentData);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Create client comment error:", error);
      res.status(500).json({ message: "Failed to create client comment", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/clients/:clientId/comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      console.log("Deleting client comment:", commentId);
      const success = await storage.deleteClientComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete client comment error:", error);
      res.status(500).json({ message: "Failed to delete comment", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/clients/by-assignment", async (req, res) => {
    try {
      const { assigneeName, userRole } = req.query;
      if (!assigneeName || !userRole) {
        return res.status(400).json({ message: "Assignee name and user role are required" });
      }
      const clients2 = await storage.getClientsByLeadAssignment(assigneeName, userRole);
      res.json(clients2);
    } catch (error) {
      console.error("Failed to fetch clients by assignment:", error);
      res.status(500).json({ message: "Failed to fetch clients by assignment" });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const projects2 = await storage.getProjectsForUser(userId, userRole);
      res.json(projects2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    try {
      console.log("Creating project with data:", req.body);
      const projectData = { ...req.body };
      if (projectData.startDate && typeof projectData.startDate === "string") {
        projectData.startDate = new Date(projectData.startDate);
      }
      if (projectData.dueDate && typeof projectData.dueDate === "string") {
        projectData.dueDate = new Date(projectData.dueDate);
      }
      const project = insertProjectSchema.parse(projectData);
      const newProject = await storage.createProject(project);
      res.status(201).json(newProject);
    } catch (error) {
      console.error("Project creation error:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
  app2.patch("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating project:", id, "with data:", req.body);
      const updateData = { ...req.body };
      if (updateData.startDate && typeof updateData.startDate === "string") {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.dueDate && typeof updateData.dueDate === "string") {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      const updatedProject = await storage.updateProject(id, updateData);
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(updatedProject);
    } catch (error) {
      console.error("Project update error:", error);
      res.status(500).json({ message: "Failed to update project", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/projects/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getProjectComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Get project comments error:", error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });
  app2.post("/api/projects/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Adding comment to project:", id, "data:", req.body);
      const commentData = {
        ...req.body,
        projectId: id
      };
      const newComment = await storage.createProjectComment(commentData);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Create project comment error:", error);
      res.status(500).json({ message: "Failed to create project comment", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Deleting project:", id);
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ message: "Failed to delete project", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.delete("/api/projects/:projectId/comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      console.log("Deleting comment:", commentId);
      const success = await storage.deleteProjectComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ message: "Failed to delete comment", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const stats = await storage.getDashboardStats(userId, userRole);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app2.post("/api/export-single", async (req, res) => {
    try {
      const { dataType, format, userId, userRole } = req.body;
      if (!dataType || format !== "xlsx") {
        return res.status(400).json({ message: "dataType and format=xlsx are required" });
      }
      let data;
      switch (dataType) {
        case "leads":
          data = await storage.getAllLeads();
          break;
        case "clients":
          data = await storage.getAllClients();
          break;
        case "partners":
          data = await storage.getAllPartners();
          break;
        case "fund-tracker":
          data = await storage.getAllFunds();
          break;
        case "client-master-data":
          if (!userId || !userRole) {
            return res.status(400).json({ message: "userId and userRole are required for client-master-data export" });
          }
          data = await storage.getAllClientMasterData(userId, userRole);
          break;
        default:
          return res.status(400).json({ message: "Invalid data type. Use: leads, clients, partners, fund-tracker, or client-master-data" });
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, dataType);
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${dataType}_export_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.get("/api/fund-tracker", async (req, res) => {
    try {
      const funds = await storage.getAllFunds();
      res.json(funds);
    } catch (error) {
      console.error("Failed to fetch funds:", error);
      res.status(500).json({ message: "Failed to fetch funds" });
    }
  });
  app2.get("/api/fund-tracker/:id", async (req, res) => {
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
  app2.post("/api/fund-tracker", async (req, res) => {
    try {
      const fundData = insertFundTrackerSchema.parse(req.body);
      const fund = await storage.createFund(fundData);
      res.status(201).json(fund);
    } catch (error) {
      console.error("Failed to create fund:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund" });
    }
  });
  app2.patch("/api/fund-tracker/:id", async (req, res) => {
    try {
      const fundData = insertFundTrackerSchema.partial().parse(req.body);
      const fund = await storage.updateFund(req.params.id, fundData);
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json(fund);
    } catch (error) {
      console.error("Failed to update fund:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update fund" });
    }
  });
  app2.delete("/api/fund-tracker/:id", async (req, res) => {
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
  app2.post("/api/fund-tracker/bulk-delete", async (req, res) => {
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
  app2.post("/api/fund-tracker/import", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }
      const columnMap = {
        "fund name": "fundName",
        "fundname": "fundName",
        "name": "fundName",
        "fund": "fundName",
        "website": "website",
        "web": "website",
        "url": "website",
        "site": "website",
        "fund website": "website",
        "type": "fundType",
        "fund type": "fundType",
        "fundtype": "fundType",
        "category": "fundType",
        "stage": "stages",
        "stages": "stages",
        "investment stage": "stages",
        "investment stages": "stages",
        "source": "source",
        "data source": "source",
        "datasource": "source",
        "origin": "source",
        "contact 1": "contactPerson1",
        "contact person 1": "contactPerson1",
        "contact1": "contactPerson1",
        "primary contact": "contactPerson1",
        "contact": "contactPerson1",
        "contact name": "contactPerson1",
        "designation 1": "designation1",
        "designation1": "designation1",
        "title 1": "designation1",
        "title": "designation1",
        "designation": "designation1",
        "email 1": "email1",
        "email1": "email1",
        "primary email": "email1",
        "email": "email1",
        "contact 2": "contactPerson2",
        "contact person 2": "contactPerson2",
        "contact2": "contactPerson2",
        "secondary contact": "contactPerson2",
        "designation 2": "designation2",
        "designation2": "designation2",
        "title 2": "designation2",
        "email 2": "email2",
        "email2": "email2",
        "secondary email": "email2",
        "phone 1": "phone1",
        "phone1": "phone1",
        "phone": "phone1",
        "primary phone": "phone1",
        "mobile 1": "phone1",
        "mobile": "phone1",
        "contact phone": "phone1",
        "phone 2": "phone2",
        "phone2": "phone2",
        "secondary phone": "phone2",
        "mobile 2": "phone2",
        "notes": "notes",
        "comments": "notes",
        "note": "notes"
      };
      const validFundTypes = ["Family Office", "PE/VC", "Strategic", "Angel Network"];
      const validStages = ["Seed/Pre-Seed", "Early", "Late", "Pre-IPO", "Listed"];
      const validSources = ["Maple Tracker", "Tracxn", "Private Circle", "Others"];
      const rowErrors = [];
      const validFunds = [];
      data.forEach((row, index) => {
        const mapped = {};
        const errors = [];
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim();
          const mappedField = columnMap[normalizedKey];
          if (mappedField && value !== void 0 && value !== null && value !== "") {
            if (mappedField === "stages") {
              const stageValue = String(value).trim();
              const stageArray = stageValue.split(/[,;]/).map((s) => s.trim()).filter((s) => s);
              mapped.stages = stageArray.filter((s) => validStages.includes(s));
            } else if (mappedField === "fundType") {
              const typeValue = String(value).trim();
              if (validFundTypes.includes(typeValue)) {
                mapped.fundType = typeValue;
              }
            } else if (mappedField === "source") {
              const sourceValue = String(value).trim();
              if (validSources.includes(sourceValue)) {
                mapped.source = sourceValue;
              }
            } else {
              mapped[mappedField] = String(value).trim();
            }
          }
        }
        if (!mapped.fundName || String(mapped.fundName).trim() === "") {
          errors.push("Fund Name is required");
        }
        if (!mapped.contactPerson1 || String(mapped.contactPerson1).trim() === "") {
          errors.push("Contact Person 1 is required");
        }
        if (!mapped.designation1 || String(mapped.designation1).trim() === "") {
          errors.push("Designation 1 is required");
        }
        if (!mapped.email1 || String(mapped.email1).trim() === "") {
          errors.push("Email 1 is required");
        }
        if (mapped.email1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mapped.email1))) {
          errors.push("Email 1 format is invalid");
        }
        if (mapped.email2 && mapped.email2.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mapped.email2))) {
          errors.push("Email 2 format is invalid");
        }
        if (errors.length > 0) {
          rowErrors.push({ row: index + 2, errors });
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
            notes: mapped.notes || null
          });
        }
      });
      if (validFunds.length === 0) {
        return res.status(400).json({
          message: "No valid funds to import. Make sure each row has: Fund Name, Contact Person 1, Designation 1, and Email 1",
          rowErrors: rowErrors.slice(0, 10)
          // Return first 10 errors
        });
      }
      const createdFunds = await storage.bulkCreateFunds(validFunds);
      res.status(201).json({
        message: `Successfully imported ${createdFunds.length} funds`,
        imported: createdFunds.length,
        skipped: data.length - createdFunds.length,
        rowErrors: rowErrors.slice(0, 10)
        // Return first 10 errors for reference
      });
    } catch (error) {
      console.error("Failed to import funds:", error);
      res.status(500).json({ message: "Failed to import funds" });
    }
  });
  app2.post("/api/fund-tracker/parse", async (req, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }
      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      if (jsonData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or has no data" });
      }
      const headers = Object.keys(jsonData[0]);
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
  app2.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getAllTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  app2.get("/api/team-members/active", async (req, res) => {
    try {
      const members = await storage.getActiveTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch active team members:", error);
      res.status(500).json({ message: "Failed to fetch active team members" });
    }
  });
  app2.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Failed to create team member:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team member" });
    }
  });
  app2.patch("/api/team-members/:id", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.partial().parse(req.body);
      const member = await storage.updateTeamMember(req.params.id, memberData);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Failed to update team member:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team member" });
    }
  });
  app2.delete("/api/team-members/:id", async (req, res) => {
    try {
      console.log("Attempting to delete team member with ID:", req.params.id);
      const existingMember = await storage.getTeamMember(req.params.id);
      console.log("Found existing member:", existingMember);
      if (!existingMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      const success = await storage.deleteTeamMember(req.params.id);
      console.log("Delete operation result:", success);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete team member" });
      }
      res.json({ message: "Team member deleted successfully" });
    } catch (error) {
      console.error("Failed to delete team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });
  app2.get("/api/client-master-data", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const data = await storage.getAllClientMasterData(userId, userRole);
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch client master data:", error);
      res.status(500).json({ message: "Failed to fetch client master data" });
    }
  });
  app2.post("/api/client-master-data", async (req, res) => {
    try {
      const masterData = insertClientMasterDataSchema.parse(req.body);
      const created = await storage.createClientMasterData(masterData);
      res.status(201).json(created);
    } catch (error) {
      console.error("Failed to create client master data:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client master data" });
    }
  });
  app2.patch("/api/client-master-data/:id", async (req, res) => {
    try {
      const masterData = insertClientMasterDataSchema.partial().parse(req.body);
      const updated = await storage.updateClientMasterData(req.params.id, masterData);
      if (!updated) {
        return res.status(404).json({ message: "Client master data not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Failed to update client master data:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client master data" });
    }
  });
  app2.delete("/api/client-master-data/:id", async (req, res) => {
    try {
      const { userRole } = req.query;
      if (userRole !== "admin") {
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
  app2.post("/api/client-master-data/bulk-delete", async (req, res) => {
    try {
      const { ids, userRole } = req.body;
      if (userRole !== "admin") {
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
  app2.post("/api/client-master-data/parse", async (req, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }
      const XLSX2 = __require("xlsx");
      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX2.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX2.utils.sheet_to_json(worksheet, { header: 1 });
      if (data.length < 2) {
        return res.status(400).json({ message: "File must contain headers and at least one row of data" });
      }
      const headers = data[0].map((h) => String(h || "").trim());
      const rows = data.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== void 0 && cell !== "")).map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? "";
        });
        return obj;
      });
      res.json({ headers, data: rows });
    } catch (error) {
      console.error("Failed to parse Excel file:", error);
      res.status(500).json({ message: "Failed to parse Excel file" });
    }
  });
  app2.post("/api/client-master-data/import", async (req, res) => {
    try {
      const { data, userId } = req.body;
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const columnMap = {
        "name": "name",
        "client name": "name",
        "contact": "name",
        "contact name": "name",
        "designation": "designation",
        "title": "designation",
        "position": "designation",
        "company": "company",
        "organization": "company",
        "firm": "company",
        "industry": "industry",
        "sector": "industry",
        "phone": "phone",
        "phone number": "phone",
        "mobile": "phone",
        "email": "email",
        "email address": "email",
        "address": "address",
        "location": "address",
        "notes": "notes",
        "comments": "notes",
        "remarks": "notes"
      };
      let imported = 0;
      for (const row of data) {
        const mappedData = { addedBy: userId };
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim();
          const mappedField = columnMap[normalizedKey];
          if (mappedField && value) {
            mappedData[mappedField] = String(value).trim();
          }
        }
        if (mappedData.name) {
          try {
            await storage.createClientMasterData(mappedData);
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
  app2.get("/api/master-data-permission", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const permission = await storage.getUserMasterDataPermission(userId);
      res.json(permission || { hasViewAccess: "false" });
    } catch (error) {
      console.error("Failed to fetch permission:", error);
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });
  app2.post("/api/master-data-permission/request", async (req, res) => {
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
  app2.get("/api/master-data-permission/pending", async (req, res) => {
    try {
      const { userRole } = req.query;
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can view pending requests" });
      }
      const requests = await storage.getPendingPermissionRequests();
      res.json(requests);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });
  app2.get("/api/master-data-permission/approved", async (req, res) => {
    try {
      const { userRole } = req.query;
      if (userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can view approved permissions" });
      }
      const permissions = await storage.getApprovedPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Failed to fetch approved permissions:", error);
      res.status(500).json({ message: "Failed to fetch approved permissions" });
    }
  });
  app2.post("/api/master-data-permission/approve/:userId", async (req, res) => {
    try {
      const { approvedBy, userRole } = req.body;
      if (userRole !== "admin") {
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
  app2.post("/api/master-data-permission/revoke/:userId", async (req, res) => {
    try {
      const { userRole } = req.body;
      if (userRole !== "admin") {
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
  app2.get("/api/outreach", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const emails = await storage.getAllOutreachEmails(userId);
      res.json(emails);
    } catch (error) {
      console.error("Failed to fetch outreach emails:", error);
      res.status(500).json({ message: "Failed to fetch outreach emails" });
    }
  });
  app2.post("/api/outreach", async (req, res) => {
    try {
      const emailData = insertOutreachEmailSchema.parse(req.body);
      const newEmail = await storage.createOutreachEmail(emailData);
      res.status(201).json(newEmail);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to create outreach email:", error);
        res.status(500).json({ message: "Failed to create outreach email" });
      }
    }
  });
  app2.post("/api/outreach/bulk", async (req, res) => {
    try {
      const { emails } = req.body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "No emails to create" });
      }
      const validEmails = emails.map((email) => insertOutreachEmailSchema.parse(email));
      const createdEmails = await storage.bulkCreateOutreachEmails(validEmails);
      res.status(201).json({
        message: `Created ${createdEmails.length} outreach emails`,
        created: createdEmails.length,
        emails: createdEmails
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to bulk create outreach emails:", error);
        res.status(500).json({ message: "Failed to create outreach emails" });
      }
    }
  });
  app2.patch("/api/outreach/:id", async (req, res) => {
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
  app2.delete("/api/outreach/:id", async (req, res) => {
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
  app2.get("/api/outreach/contacts/fund-tracker", async (req, res) => {
    try {
      const funds = await storage.getAllFunds();
      const contacts = [];
      funds.forEach((fund) => {
        if (fund.email1) {
          contacts.push({
            name: fund.contactPerson1,
            email: fund.email1,
            company: fund.fundName,
            designation: fund.designation1,
            phone: fund.phone1 || null,
            source: "fund_tracker",
            sourceId: fund.id
          });
        }
        if (fund.email2) {
          contacts.push({
            name: fund.contactPerson2,
            email: fund.email2,
            company: fund.fundName,
            designation: fund.designation2,
            phone: fund.phone2 || null,
            source: "fund_tracker",
            sourceId: fund.id
          });
        }
      });
      res.json(contacts);
    } catch (error) {
      console.error("Failed to fetch fund tracker contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.get("/api/outreach/contacts/client-master-data", async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      if (!userId || !userRole) {
        return res.status(400).json({ message: "User ID and role are required" });
      }
      const clientData = await storage.getAllClientMasterData(userId, userRole);
      const contacts = clientData.filter((client) => client.email).map((client) => ({
        name: client.name,
        email: client.email,
        company: client.company,
        designation: client.designation,
        phone: client.phone || null,
        source: "client_master_data",
        sourceId: client.id
      }));
      res.json(contacts);
    } catch (error) {
      console.error("Failed to fetch client master data contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.get("/api/outreach/campaigns", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const campaigns = await storage.getAllOutreachCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Failed to fetch outreach campaigns:", error);
      res.status(500).json({ message: "Failed to fetch outreach campaigns" });
    }
  });
  app2.post("/api/outreach/campaigns", async (req, res) => {
    try {
      const campaignData = insertOutreachCampaignSchema.parse(req.body);
      const newCampaign = await storage.createOutreachCampaign(campaignData);
      res.status(201).json(newCampaign);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Failed to create outreach campaign:", error);
        res.status(500).json({ message: "Failed to create outreach campaign" });
      }
    }
  });
  app2.delete("/api/outreach/campaigns/:id", async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/middleware/bot-auth.ts
function authenticateBotRequest(req, res, next) {
  const botKey = req.headers["x-bot-key"];
  if (!botKey) {
    return res.status(401).json({
      success: false,
      message: "Bot API key is required. Please provide X-Bot-Key header."
    });
  }
  if (botKey !== process.env.BOT_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid bot API key."
    });
  }
  next();
}

// server/bot-routes.ts
import { z as z3 } from "zod";
function registerBotRoutes(app2) {
  app2.post(
    "/api/bot/link-account",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId, platformUsername, email, password } = req.body;
        if (!platform || !platformUserId || !email || !password) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields: platform, platformUserId, email, password"
          });
        }
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.getUserByUsername(email);
        }
        if (!user || user.password !== password) {
          return res.status(401).json({
            success: false,
            message: "Invalid email or password"
          });
        }
        const existingMapping = await storage.getBotUserMapping(
          platform,
          platformUserId
        );
        if (existingMapping) {
          const updated = await storage.updateBotUserMapping(
            platform,
            platformUserId,
            {
              crmUserId: user.id,
              platformUsername,
              isActive: "true"
            }
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
              role: user.role
            }
          });
        }
        const mapping = await storage.createBotUserMapping({
          platform,
          platformUserId,
          platformUsername,
          crmUserId: user.id,
          isActive: "true"
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
            role: user.role
          }
        });
      } catch (error) {
        console.error("Link account error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to link account"
        });
      }
    }
  );
  app2.post(
    "/api/bot/unlink-account",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.body;
        if (!platform || !platformUserId) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields: platform, platformUserId"
          });
        }
        await storage.deactivateBotUserMapping(platform, platformUserId);
        res.json({
          success: true,
          message: "Account unlinked successfully"
        });
      } catch (error) {
        console.error("Unlink account error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to unlink account"
        });
      }
    }
  );
  app2.get(
    "/api/bot/user-info/:platform/:platformUserId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.params;
        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId
        );
        if (!mapping) {
          return res.status(404).json({
            success: false,
            message: "User not linked. Please link your account first."
          });
        }
        const user = await storage.getUser(mapping.crmUserId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "CRM user not found"
          });
        }
        res.json({
          success: true,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
          },
          mapping: {
            platform: mapping.platform,
            platformUsername: mapping.platformUsername,
            linkedAt: mapping.linkedAt
          }
        });
      } catch (error) {
        console.error("Get user info error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get user info"
        });
      }
    }
  );
  app2.post("/api/bot/leads", authenticateBotRequest, async (req, res) => {
    try {
      const { platformUserId, platform, ...leadData } = req.body;
      const mapping = await storage.getBotUserMapping(platform, platformUserId);
      if (!mapping) {
        return res.status(403).json({
          success: false,
          message: "User not linked. Please link your account first using /link command."
        });
      }
      const user = await storage.getUser(mapping.crmUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "CRM user not found"
        });
      }
      const knownSectors = ["Technology", "Manufacturing", "Healthcare", "Energy", "Real Estate", "Consumer Goods", "Others"];
      let sector = leadData.sector;
      let customSector = void 0;
      if (leadData.sector && !knownSectors.includes(leadData.sector)) {
        customSector = leadData.sector;
        sector = "Others";
      }
      const knownTransactionTypes = ["M&A", "Fundraising", "Debt Financing", "Strategic Advisory", "Others"];
      let transactionType = leadData.transactionType;
      let customTransactionType = void 0;
      if (leadData.transactionType && !knownTransactionTypes.includes(leadData.transactionType)) {
        customTransactionType = leadData.transactionType;
        transactionType = "Others";
      }
      const knownInboundSources = ["Kotak Wealth", "360 Wealth", "LGT", "Pandion Partners", "Others"];
      let inboundSource = leadData.inboundSource;
      let customInboundSource = void 0;
      if (leadData.sourceType === "Inbound" && leadData.inboundSource && !knownInboundSources.includes(leadData.inboundSource)) {
        customInboundSource = leadData.inboundSource;
        inboundSource = "Others";
      }
      const completeLeadData = {
        ...leadData,
        ownerId: user.id,
        assignedTo: `${user.firstName} ${user.lastName}`,
        status: "Initial Discussion",
        acceptanceStage: "Undecided",
        sector,
        customSector,
        transactionType,
        customTransactionType,
        inboundSource,
        customInboundSource
      };
      const validatedData = insertLeadSchema.parse(completeLeadData);
      const newLead = await storage.createLead(validatedData);
      res.json({
        success: true,
        message: "Lead created successfully",
        lead: newLead
      });
    } catch (error) {
      console.error("Create lead error:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post(
    "/api/bot/leads/:leadId/convert",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { leadId } = req.params;
        const { platformUserId, platform } = req.body;
        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId
        );
        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked"
          });
        }
        const result = await storage.convertLeadToClient(leadId);
        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Lead not found or already converted"
          });
        }
        res.json({
          success: true,
          message: "Lead converted to client successfully",
          client: result.client
        });
      } catch (error) {
        console.error("Convert lead error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to convert lead"
        });
      }
    }
  );
  app2.get(
    "/api/bot/stats/:platform/:platformUserId",
    authenticateBotRequest,
    async (req, res) => {
      try {
        const { platform, platformUserId } = req.params;
        const mapping = await storage.getBotUserMapping(
          platform,
          platformUserId
        );
        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "User not linked"
          });
        }
        const user = await storage.getUser(mapping.crmUserId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
        const leads2 = await storage.getLeadsByOwner(user.id, user.role);
        const stats = {
          totalLeads: leads2.length,
          byStatus: {
            initialDiscussion: leads2.filter(
              (l) => l.status === "Initial Discussion"
            ).length,
            nda: leads2.filter((l) => l.status === "NDA").length,
            engagement: leads2.filter((l) => l.status === "Engagement").length
          },
          byAcceptance: {
            undecided: leads2.filter((l) => l.acceptanceStage === "Undecided").length,
            accepted: leads2.filter((l) => l.acceptanceStage === "Accepted").length,
            rejected: leads2.filter((l) => l.acceptanceStage === "Rejected").length
          },
          converted: leads2.filter((l) => l.isConverted === "true").length
        };
        res.json({
          success: true,
          stats,
          user: {
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to get stats"
        });
      }
    }
  );
  app2.get("/api/bot/health", authenticateBotRequest, async (req, res) => {
    res.json({
      success: true,
      message: "Bot API is running",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
}

// server/services/telegram-service.ts
import { Bot, InlineKeyboard } from "grammy";
var sessions = /* @__PURE__ */ new Map();
var TelegramService = class {
  bot;
  config;
  constructor(config) {
    this.config = config;
    this.bot = new Bot(config.botToken);
    this.setupHandlers();
  }
  setupHandlers() {
    this.bot.command("start", async (ctx) => {
      await ctx.reply(
        "\u{1F44B} Welcome to Maple Advisors CRM Bot!\n\nUse /link to connect your account.\nUse /newlead to add a lead.\nUse /stats to view your stats.\nUse /help to see all commands."
      );
    });
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "\u{1F4CB} Available Commands:\n\n/link - Link your Telegram to CRM\n/newlead - Add a new lead\n/stats - View your lead statistics\n/cancel - Cancel current operation\n/help - Show this message"
      );
    });
    this.bot.command("cancel", async (ctx) => {
      const userId = ctx.from?.id;
      if (userId && sessions.has(userId)) {
        sessions.delete(userId);
        await ctx.reply("\u274C Operation cancelled.");
      } else {
        await ctx.reply("Nothing to cancel.");
      }
    });
    this.bot.command("link", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      sessions.set(userId, { step: "link_email", data: {} });
      await ctx.reply(
        "\u{1F517} Let's link your CRM account!\n\nPlease enter your CRM email address:"
      );
    });
    this.bot.command("newlead", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) {
        await ctx.reply(
          "\u274C You need to link your account first.\nUse /link to connect your CRM account."
        );
        return;
      }
      sessions.set(userId, { step: "lead_company", data: {} });
      await ctx.reply("\u{1F4CB} Let's add a new lead!\n\nWhat is the company name?");
    });
    this.bot.command("stats", async (ctx) => {
      const platformUserId = ctx.from?.id.toString();
      if (!platformUserId) return;
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/bot/stats/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } }
        );
        const data = await response.json();
        if (!data.success) {
          await ctx.reply("\u274C You're not linked yet.\nUse /link to connect your account.");
          return;
        }
        const { stats, user } = data;
        await ctx.reply(
          `\u{1F4CA} Stats for ${user.firstName} ${user.lastName}

Total Leads: ${stats.totalLeads}
\u251C\u2500 Initial Discussion: ${stats.byStatus.initialDiscussion}
\u251C\u2500 NDA: ${stats.byStatus.nda}
\u2514\u2500 Engagement: ${stats.byStatus.engagement}

\u2705 Converted to Clients: ${stats.converted}`
        );
      } catch (error) {
        await ctx.reply("\u274C Failed to fetch stats. Please try again.");
      }
    });
    this.bot.on("callback_query:data", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const session = sessions.get(userId);
      if (!session) {
        await ctx.answerCallbackQuery("Session expired. Use /newlead to start again.");
        return;
      }
      const data = ctx.callbackQuery.data;
      await ctx.answerCallbackQuery();
      await this.handleCallbackQuery(ctx, session, data, userId);
    });
    this.bot.on("message:text", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const text2 = ctx.message.text;
      if (text2.startsWith("/")) return;
      const session = sessions.get(userId);
      if (!session) {
        await ctx.reply(
          "\u2139\uFE0F Use /newlead to add a lead or /help to see commands."
        );
        return;
      }
      await this.handleTextInput(ctx, session, text2, userId);
    });
  }
  // ============================================
  // Handle Button Clicks
  // ============================================
  async handleCallbackQuery(ctx, session, data, userId) {
    switch (session.step) {
      case "lead_sector":
        if (data === "sector_Others") {
          session.step = "lead_sector_custom";
          sessions.set(userId, session);
          await ctx.reply("Please type the sector name:");
        } else {
          session.data.sector = data.replace("sector_", "");
          session.step = "lead_transaction";
          sessions.set(userId, session);
          await this.askTransactionType(ctx);
        }
        break;
      case "lead_transaction":
        if (data === "tx_Others") {
          session.step = "lead_transaction_custom";
          sessions.set(userId, session);
          await ctx.reply("Please type the transaction type:");
        } else {
          session.data.transactionType = data.replace("tx_", "");
          session.step = "lead_poc";
          sessions.set(userId, session);
          await ctx.reply("\u{1F464} Who is the Point of Contact (POC)?");
        }
        break;
      case "lead_source_type":
        session.data.sourceType = data.replace("source_", "");
        if (session.data.sourceType === "Inbound") {
          session.step = "lead_inbound_source";
          sessions.set(userId, session);
          await this.askInboundSource(ctx);
        } else {
          session.step = "lead_outbound_source";
          sessions.set(userId, session);
          await ctx.reply("\u{1F4E4} Who referred this lead? (Enter name/firm):");
        }
        break;
      case "lead_inbound_source":
        if (data === "inbound_Others") {
          session.step = "lead_inbound_source_custom";
          sessions.set(userId, session);
          await ctx.reply("Please type the inbound source:");
        } else {
          session.data.inboundSource = data.replace("inbound_", "");
          sessions.set(userId, session);
          await this.confirmAndCreateLead(ctx, session, userId);
        }
        break;
    }
  }
  // ============================================
  // Handle Text Input
  // ============================================
  async handleTextInput(ctx, session, text2, userId) {
    switch (session.step) {
      // LINKING FLOW
      case "link_email":
        session.data.email = text2.trim();
        session.step = "link_password";
        sessions.set(userId, session);
        await ctx.reply("\u{1F511} Now enter your CRM password:");
        break;
      case "link_password":
        session.data.password = text2.trim();
        sessions.delete(userId);
        await this.linkAccount(ctx, session.data.email, session.data.password);
        break;
      // LEAD CREATION FLOW
      case "lead_company":
        session.data.companyName = text2.trim();
        session.step = "lead_sector";
        sessions.set(userId, session);
        await this.askSector(ctx);
        break;
      case "lead_sector_custom":
        session.data.sector = text2.trim();
        session.step = "lead_transaction";
        sessions.set(userId, session);
        await this.askTransactionType(ctx);
        break;
      case "lead_transaction_custom":
        session.data.transactionType = text2.trim();
        session.step = "lead_poc";
        sessions.set(userId, session);
        await ctx.reply("\u{1F464} Who is the Point of Contact (POC)?");
        break;
      case "lead_poc":
        session.data.clientPoc = text2.trim();
        session.step = "lead_email";
        sessions.set(userId, session);
        await ctx.reply("\u{1F4E7} What is their email address?");
        break;
      case "lead_email":
        session.data.emailId = text2.trim();
        session.step = "lead_phone";
        sessions.set(userId, session);
        await ctx.reply("\u{1F4F1} What is their phone number?");
        break;
      case "lead_phone":
        session.data.phoneNumber = text2.trim();
        session.step = "lead_source_type";
        sessions.set(userId, session);
        await this.askSourceType(ctx);
        break;
      case "lead_outbound_source":
        session.data.outboundSource = text2.trim();
        sessions.set(userId, session);
        await this.confirmAndCreateLead(ctx, session, userId);
        break;
      case "lead_inbound_source_custom":
        session.data.inboundSource = text2.trim();
        sessions.set(userId, session);
        await this.confirmAndCreateLead(ctx, session, userId);
        break;
      default:
        await ctx.reply("\u2139\uFE0F Use /newlead to add a lead or /help to see commands.");
        break;
    }
  }
  // ============================================
  // Ask Questions with Buttons
  // ============================================
  async askSector(ctx) {
    const keyboard = new InlineKeyboard().text("Technology", "sector_Technology").text("Manufacturing", "sector_Manufacturing").row().text("Healthcare", "sector_Healthcare").text("Energy", "sector_Energy").row().text("Real Estate", "sector_Real Estate").text("Consumer Goods", "sector_Consumer Goods").row().text("Others", "sector_Others");
    await ctx.reply("\u{1F3ED} Select the sector:", { reply_markup: keyboard });
  }
  async askTransactionType(ctx) {
    const keyboard = new InlineKeyboard().text("M&A", "tx_M&A").text("Fundraising", "tx_Fundraising").row().text("Debt Financing", "tx_Debt Financing").text("Strategic Advisory", "tx_Strategic Advisory").row().text("Others", "tx_Others");
    await ctx.reply("\u{1F4BC} Select the transaction type:", { reply_markup: keyboard });
  }
  async askSourceType(ctx) {
    const keyboard = new InlineKeyboard().text("Inbound", "source_Inbound").text("Outbound", "source_Outbound");
    await ctx.reply("\u{1F4E5} Is this an inbound or outbound lead?", { reply_markup: keyboard });
  }
  async askInboundSource(ctx) {
    const keyboard = new InlineKeyboard().text("Kotak Wealth", "inbound_Kotak Wealth").text("360 Wealth", "inbound_360 Wealth").row().text("LGT", "inbound_LGT").text("Pandion Partners", "inbound_Pandion Partners").row().text("Others", "inbound_Others");
    await ctx.reply("\u{1F4E5} Select the inbound source:", { reply_markup: keyboard });
  }
  // ============================================
  // Link Account
  // ============================================
  async linkAccount(ctx, email, password) {
    const platformUserId = ctx.from?.id.toString();
    const platformUsername = ctx.from?.username;
    try {
      const response = await fetch(`${this.config.apiUrl}/api/bot/link-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Key": this.config.botSecretKey
        },
        body: JSON.stringify({
          platform: "telegram",
          platformUserId,
          platformUsername,
          email,
          password
        })
      });
      const data = await response.json();
      if (data.success) {
        await ctx.reply(
          `\u2705 Account linked successfully!

Welcome, ${data.user.firstName} ${data.user.lastName}!

You can now:
\u2022 Use /newlead to add leads
\u2022 Use /stats to view your stats`
        );
      } else {
        await ctx.reply(
          `\u274C ${data.message}

Please try again with /link`
        );
      }
    } catch (error) {
      await ctx.reply("\u274C Failed to link account. Please try again with /link");
    }
  }
  // ============================================
  // Create Lead
  // ============================================
  async confirmAndCreateLead(ctx, session, userId) {
    const platformUserId = ctx.from?.id.toString();
    sessions.delete(userId);
    const { companyName, sector, transactionType, clientPoc, emailId, phoneNumber, sourceType, inboundSource, outboundSource } = session.data;
    await ctx.reply(
      `\u{1F4CB} Creating lead...

Company: ${companyName}
Sector: ${sector}
Type: ${transactionType}
POC: ${clientPoc}
Email: ${emailId}
Phone: ${phoneNumber}
Source: ${sourceType} - ${inboundSource || outboundSource}`
    );
    try {
      const response = await fetch(`${this.config.apiUrl}/api/bot/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Key": this.config.botSecretKey
        },
        body: JSON.stringify({
          platformUserId,
          platform: "telegram",
          companyName,
          sector,
          transactionType,
          clientPoc,
          emailId,
          phoneNumber,
          sourceType,
          inboundSource,
          outboundSource
        })
      });
      const data = await response.json();
      if (data.success) {
        const sectorDisplay = data.lead.customSector || data.lead.sector;
        const transactionDisplay = data.lead.customTransactionType || data.lead.transactionType;
        const sourceDisplay = data.lead.customInboundSource || data.lead.inboundSource || data.lead.outboundSource;
        await ctx.reply(
          `\u2705 Lead Added Successfully!

\u{1F4CB} ${data.lead.companyName}
\u{1F3ED} ${sectorDisplay} - ${transactionDisplay}
\u{1F464} ${data.lead.clientPoc}
\u{1F4E7} ${data.lead.emailId}
\u{1F4F1} ${data.lead.phoneNumber}
\u{1F4E5} ${data.lead.sourceType}: ${sourceDisplay}

Status: ${data.lead.status}

Use /newlead to add another lead.`
        );
      } else {
        await ctx.reply(`\u274C Failed to add lead: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating lead via bot:", error);
      await ctx.reply("\u274C Failed to add lead. Please try again with /newlead");
    }
  }
  // ============================================
  // Helper Functions
  // ============================================
  async checkUserLinked(platformUserId) {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/user-info/telegram/${platformUserId}`,
        { headers: { "X-Bot-Key": this.config.botSecretKey } }
      );
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }
  async start() {
    console.log("\u{1F916} Starting Telegram bot...");
    this.bot.start().catch((error) => {
      console.error("\u274C Telegram bot error:", error);
    });
    console.log("\u2705 Telegram bot started (connecting...)");
  }
  async stop() {
    console.log("\u{1F6D1} Stopping Telegram bot...");
    await this.bot.stop();
    console.log("\u2705 Telegram bot stopped.");
  }
};

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  registerBotRoutes(app);
  let telegramBot = null;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const port2 = parseInt(process.env.PORT || "5000", 10);
      telegramBot = new TelegramService({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        botSecretKey: process.env.BOT_SECRET_KEY || "",
        apiUrl: `http://localhost:${port2}`
      });
      await telegramBot.start();
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
    }
  } else {
    log(`TELEGRAM_BOT_TOKEN not set, skipping Telegram bot initialization`);
  }
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
