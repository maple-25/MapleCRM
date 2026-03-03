import { pgTable, foreignKey, varchar, text, timestamp, numeric, integer, type AnyPgColumn, unique, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const acceptanceStage = pgEnum("acceptance_stage", ['Undecided', 'Accepted', 'Rejected'])
export const assignedTo = pgEnum("assigned_to", ['Pankaj Karna', 'Nitin Gupta', 'Abhinav Grover', 'Manish Johari', 'Aakash Jain', 'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh'])
export const clientStatus = pgEnum("client_status", ['NDA Shared', 'NDA Signed', 'IM/Financial Model', 'Investor Tracker', 'Term Sheet', 'Due Diligence', 'Agreement', 'Transaction closed'])
export const commentType = pgEnum("comment_type", ['update', 'change', 'feedback'])
export const inboundSource = pgEnum("inbound_source", ['Kotak Wealth', '360 Wealth', 'LGT', 'Pandion Partners', 'Others'])
export const leadStatus = pgEnum("lead_status", ['Initial Discussion', 'NDA', 'Engagement'])
export const priority = pgEnum("priority", ['low', 'medium', 'high', 'urgent'])
export const projectPriority = pgEnum("project_priority", ['low', 'medium', 'high', 'urgent'])
export const projectStatus = pgEnum("project_status", ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'in_progress'])
export const sector = pgEnum("sector", ['Technology', 'Manufacturing', 'Healthcare', 'Energy', 'Real Estate', 'Consumer Goods', 'Others'])
export const sourceType = pgEnum("source_type", ['Inbound', 'Outbound'])
export const transactionType = pgEnum("transaction_type", ['M&A', 'Fundraising', 'Debt Financing', 'Strategic Advisory', 'Others'])
export const userRole = pgEnum("user_role", ['admin', 'user'])


export const clientComments = pgTable("client_comments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	clientId: varchar("client_id").notNull(),
	userId: varchar("user_id").notNull(),
	commentType: commentType("comment_type").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	parentCommentId: text("parent_comment_id"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_comments_client_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentCommentId],
			foreignColumns: [table.id],
			name: "client_comments_parent_comment_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "client_comments_user_id_fkey"
		}),
]);

export const projects = pgTable("projects", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	clientId: varchar("client_id"),
	ownerId: varchar("owner_id").notNull(),
	status: projectStatus().default('planning').notNull(),
	budget: numeric({ precision: 10, scale:  2 }),
	progress: integer().default(0),
	startDate: timestamp("start_date", { mode: 'string' }),
	dueDate: timestamp("due_date", { mode: 'string' }),
	completedDate: timestamp("completed_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	priority: priority().default('medium').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "projects_client_id_fkey"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "projects_owner_id_fkey"
		}),
]);

export const leads = pgTable("leads", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	companyName: text("company_name").notNull(),
	sector: sector().notNull(),
	customSector: text("custom_sector"),
	transactionType: transactionType("transaction_type").notNull(),
	customTransactionType: text("custom_transaction_type"),
	clientPoc: text("client_poc").notNull(),
	phoneNumber: text("phone_number"),
	emailId: text("email_id").notNull(),
	firstContacted: timestamp("first_contacted", { mode: 'string' }),
	lastContacted: timestamp("last_contacted", { mode: 'string' }),
	sourceType: sourceType("source_type").notNull(),
	inboundSource: inboundSource("inbound_source"),
	customInboundSource: text("custom_inbound_source"),
	outboundSource: text("outbound_source"),
	acceptanceStage: acceptanceStage("acceptance_stage").default('Undecided').notNull(),
	status: leadStatus().default('Initial Discussion').notNull(),
	assignedTo: text("assigned_to").notNull(),
	isConverted: text("is_converted").default('false'),
	convertedClientId: varchar("converted_client_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	ownerId: varchar("owner_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.convertedClientId],
			foreignColumns: [clients.id],
			name: "leads_converted_client_id_fkey"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "leads_owner_id_fkey"
		}),
]);

export const clients = pgTable("clients", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	companyName: text("company_name").notNull(),
	sector: sector().notNull(),
	customSector: text("custom_sector"),
	transactionType: transactionType("transaction_type").notNull(),
	customTransactionType: text("custom_transaction_type"),
	clientPoc: text("client_poc").notNull(),
	phoneNumber: text("phone_number"),
	emailId: text("email_id").notNull(),
	lastContacted: timestamp("last_contacted", { mode: 'string' }),
	status: clientStatus().default('NDA Shared').notNull(),
	assignedTo: text("assigned_to").notNull(),
	convertedFromLeadId: varchar("converted_from_lead_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	ownerId: varchar("owner_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "clients_owner_id_fkey"
		}),
	foreignKey({
			columns: [table.convertedFromLeadId],
			foreignColumns: [leads.id],
			name: "fk_converted_from_lead"
		}),
]);

export const projectComments = pgTable("project_comments", {
	id: text().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	userId: text("user_id").notNull(),
	commentType: commentType("comment_type").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	parentCommentId: text("parent_comment_id"),
}, (table) => [
	foreignKey({
			columns: [table.parentCommentId],
			foreignColumns: [table.id],
			name: "project_comments_parent_comment_id_fkey"
		}),
]);

export const partners = pgTable("partners", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	website: text(),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }).default('0.00'),
	isActive: text("is_active").default('true').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: text().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	role: userRole().default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_key").on(table.email),
	unique("users_username_key").on(table.username),
]);

export const projectMembers = pgTable("project_members", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	userId: varchar("user_id").notNull(),
	canEdit: text("can_edit").default('false').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_members_project_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_members_user_id_fkey"
		}),
]);
