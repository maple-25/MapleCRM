import { relations } from "drizzle-orm/relations";
import { clients, clientComments, users, projects, leads, projectComments, projectMembers } from "./schema";

export const clientCommentsRelations = relations(clientComments, ({one, many}) => ({
	client: one(clients, {
		fields: [clientComments.clientId],
		references: [clients.id]
	}),
	clientComment: one(clientComments, {
		fields: [clientComments.parentCommentId],
		references: [clientComments.id],
		relationName: "clientComments_parentCommentId_clientComments_id"
	}),
	clientComments: many(clientComments, {
		relationName: "clientComments_parentCommentId_clientComments_id"
	}),
	user: one(users, {
		fields: [clientComments.userId],
		references: [users.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	clientComments: many(clientComments),
	projects: many(projects),
	leads: many(leads, {
		relationName: "leads_convertedClientId_clients_id"
	}),
	user: one(users, {
		fields: [clients.ownerId],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [clients.convertedFromLeadId],
		references: [leads.id],
		relationName: "clients_convertedFromLeadId_leads_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	clientComments: many(clientComments),
	projects: many(projects),
	leads: many(leads),
	clients: many(clients),
	projectMembers: many(projectMembers),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	client: one(clients, {
		fields: [projects.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [projects.ownerId],
		references: [users.id]
	}),
	projectMembers: many(projectMembers),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	client: one(clients, {
		fields: [leads.convertedClientId],
		references: [clients.id],
		relationName: "leads_convertedClientId_clients_id"
	}),
	user: one(users, {
		fields: [leads.ownerId],
		references: [users.id]
	}),
	clients: many(clients, {
		relationName: "clients_convertedFromLeadId_leads_id"
	}),
}));

export const projectCommentsRelations = relations(projectComments, ({one, many}) => ({
	projectComment: one(projectComments, {
		fields: [projectComments.parentCommentId],
		references: [projectComments.id],
		relationName: "projectComments_parentCommentId_projectComments_id"
	}),
	projectComments: many(projectComments, {
		relationName: "projectComments_parentCommentId_projectComments_id"
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({one}) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id]
	}),
}));