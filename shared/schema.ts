import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const leadStatusEnum = pgEnum('lead_status', ['Initial Discussion', 'NDA', 'Engagement']);
export const clientStatusEnum = pgEnum('client_status', ['NDA Shared', 'NDA Signed', 'IM/Financial Model', 'Investor Tracker', 'Term Sheet', 'Due Diligence', 'Agreement', 'Transaction closed', 'Client Dropped']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']);
export const projectPriorityEnum = pgEnum('project_priority', ['low', 'medium', 'high', 'urgent']);
export const commentTypeEnum = pgEnum('comment_type', ['update', 'change', 'feedback']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const sectorEnum = pgEnum('sector', ['Technology', 'Manufacturing', 'Healthcare', 'Energy', 'Real Estate', 'Consumer Goods', 'Others']);
export const transactionTypeEnum = pgEnum('transaction_type', ['M&A', 'Fundraising', 'Debt Financing', 'Strategic Advisory', 'Others']);
export const sourceTypeEnum = pgEnum('source_type', ['Inbound', 'Outbound']);
export const inboundSourceEnum = pgEnum('inbound_source', ['Kotak Wealth', '360 Wealth', 'LGT', 'Pandion Partners', 'Others']);
export const acceptanceStageEnum = pgEnum('acceptance_stage', ['Undecided', 'Accepted', 'Rejected']);
export const assignedToEnum = pgEnum('assigned_to', ['Pankaj Karna', 'Nitin Gupta', 'Abhinav Grover', 'Manish Johari', 'Aakash Jain', 'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh']);
export const leadAssignmentEnum = pgEnum('lead_assignment', ['Pankaj Karna', 'Nitin Gupta', 'Aakash Jain', 'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh']);

// Team Members table for Lead/Co-Lead management
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  isActive: text("is_active").notNull().default('true'),
  position: text("position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fund Tracker table
export const fundTracker = pgTable("fund_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fundName: text("fund_name").notNull(),
  contactPerson1: text("contact_person_1").notNull(),
  designation1: text("designation_1").notNull(),
  email1: text("email_1").notNull(),
  contactPerson2: text("contact_person_2"),
  designation2: text("designation_2"),
  email2: text("email_2"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('user'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Partners table
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('0.00'),
  isActive: text("is_active").notNull().default('true'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  sector: sectorEnum("sector").notNull(),
  customSector: text("custom_sector"), // For when "Others" is selected
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  customTransactionType: text("custom_transaction_type"), // For when "Others" is selected
  clientPoc: text("client_poc").notNull(),
  phoneNumber: text("phone_number"),
  emailId: text("email_id").notNull(),
  firstContacted: timestamp("first_contacted"),
  lastContacted: timestamp("last_contacted"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  inboundSource: inboundSourceEnum("inbound_source"), // For inbound leads
  customInboundSource: text("custom_inbound_source"), // For inbound "Others"
  outboundSource: text("outbound_source"), // For outbound leads
  acceptanceStage: acceptanceStageEnum("acceptance_stage").notNull().default('Undecided'),
  status: leadStatusEnum("status").notNull().default('Initial Discussion'),
  assignedTo: text("assigned_to").notNull(),
  leadAssignment: leadAssignmentEnum("lead_assignment"),
  coLeadAssignment: leadAssignmentEnum("co_lead_assignment"),
  isConverted: text("is_converted").default('false'), // For lead to client conversion
  convertedClientId: varchar("converted_client_id").references(() => clients.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
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
  status: clientStatusEnum("status").notNull().default('NDA Shared'),
  assignedTo: text("assigned_to").notNull(),
  leadAssignment: leadAssignmentEnum("lead_assignment"),
  coLeadAssignment: leadAssignmentEnum("co_lead_assignment"),
  controlSheetLink: text("control_sheet_link"),
  convertedFromLeadId: varchar("converted_from_lead_id"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default('planning'),
  priority: projectPriorityEnum("priority").notNull().default('medium'),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  clientId: varchar("client_id").references(() => clients.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project comments table
export const projectComments: any = pgTable("project_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentCommentId: varchar("parent_comment_id").references((): any => projectComments.id),
  commentType: commentTypeEnum("comment_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project members table (for role-based access)
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  canEdit: text("can_edit").notNull().default('false'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client comments table
export const clientComments: any = pgTable("client_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  parentCommentId: varchar("parent_comment_id").references((): any => clientComments.id),
  commentType: commentTypeEnum("comment_type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Client Master Data table
export const clientMasterData = pgTable("client_master_data", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Master Data Permissions table
export const userMasterDataPermissions = pgTable("user_master_data_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  hasViewAccess: text("has_view_access").notNull().default('false'),
  requestedAt: timestamp("requested_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  firstContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  lastContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastContacted: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  dueDate: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
}).extend({
  parentCommentId: z.string().optional(),
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true,
});

export const insertClientCommentSchema = createInsertSchema(clientComments).omit({
  id: true,
  createdAt: true,
}).extend({
  parentCommentId: z.string().optional(),
});

export const insertFundTrackerSchema = createInsertSchema(fundTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ClientComment = typeof clientComments.$inferSelect;
export type InsertClientComment = z.infer<typeof insertClientCommentSchema>;
export type FundTracker = typeof fundTracker.$inferSelect;
export type InsertFundTracker = z.infer<typeof insertFundTrackerSchema>;

// Team Members schemas
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// Client Master Data schemas
export const insertClientMasterDataSchema = createInsertSchema(clientMasterData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ClientMasterData = typeof clientMasterData.$inferSelect;
export type InsertClientMasterData = z.infer<typeof insertClientMasterDataSchema>;

// User Master Data Permissions schemas
export const insertUserMasterDataPermissionSchema = createInsertSchema(userMasterDataPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  requestedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
  approvedAt: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (!val || val === "") return null;
    return typeof val === "string" ? new Date(val) : val;
  }).optional().nullable(),
});

export type UserMasterDataPermission = typeof userMasterDataPermissions.$inferSelect;
export type InsertUserMasterDataPermission = z.infer<typeof insertUserMasterDataPermissionSchema>;
