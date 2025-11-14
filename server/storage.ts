import { 
  type User, type InsertUser, type Lead, type InsertLead, type Client, type InsertClient, 
  type Project, type InsertProject, type Partner, type InsertPartner, 
  type ProjectMember, type InsertProjectMember, type ProjectComment, type InsertProjectComment,
  type ClientComment, type InsertClientComment, type FundTracker, type InsertFundTracker,
  type TeamMember, type InsertTeamMember, type ClientMasterData, type InsertClientMasterData,
  type UserMasterDataPermission, type InsertUserMasterDataPermission
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import fs from "fs";
import postgres from "postgres";
import { users, partners, leads, clients, projects, projectMembers, projectComments, clientComments, fundTracker, teamMembers, clientMasterData, userMasterDataPermissions } from "@shared/schema";
import { eq, sql, desc, and, or, ne, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Partners
  getAllPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  
  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLeadsByOwner(userId: string, userRole: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  // Clients
  getAllClients(): Promise<Client[]>;
  getClientsByOwner(userId: string, userRole: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getProjectsByOwner(ownerId: string): Promise<Project[]>;
  
  // Project Members
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  
  // Project Comments
  getProjectComments(projectId: string): Promise<ProjectComment[]>;
  addProjectComment(comment: InsertProjectComment): Promise<ProjectComment>;
  deleteProjectComment(commentId: string): Promise<boolean>;
  
  // Client Comments
  getClientComments(clientId: string): Promise<ClientComment[]>;
  addClientComment(comment: InsertClientComment): Promise<ClientComment>;
  deleteClientComment(commentId: string): Promise<boolean>;
  
  // Partner-specific leads (for affiliate tabs)
  getLeadsByInboundSource(source: string): Promise<Lead[]>;
  
  // Dashboard stats
  getDashboardStats(userId: string, userRole: string): Promise<{
    totalLeads: number;
    activeClients: number;
    activeProjects: number;
  }>;
  
  // Lead and Co-Lead filtering
  getLeadsByLeadAssignment(assigneeName: string, userRole: string): Promise<Lead[]>;
  getClientsByLeadAssignment(assigneeName: string, userRole: string): Promise<Client[]>;
  
  // Fund Tracker
  getAllFunds(): Promise<FundTracker[]>;
  getFund(id: string): Promise<FundTracker | undefined>;
  createFund(fund: InsertFundTracker): Promise<FundTracker>;
  updateFund(id: string, fund: Partial<FundTracker>): Promise<FundTracker | undefined>;
  deleteFund(id: string): Promise<boolean>;
  
  // Team Members
  getAllTeamMembers(): Promise<TeamMember[]>;
  getActiveTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;
  
  // Client Master Data
  getAllClientMasterData(userId: string, userRole: string): Promise<ClientMasterData[]>;
  getClientMasterData(id: string): Promise<ClientMasterData | undefined>;
  createClientMasterData(data: InsertClientMasterData): Promise<ClientMasterData>;
  updateClientMasterData(id: string, data: Partial<ClientMasterData>): Promise<ClientMasterData | undefined>;
  deleteClientMasterData(id: string): Promise<boolean>;
  
  // User Master Data Permissions
  getUserMasterDataPermission(userId: string): Promise<UserMasterDataPermission | undefined>;
  createPermissionRequest(userId: string): Promise<UserMasterDataPermission>;
  approvePermissionRequest(userId: string, approvedBy: string): Promise<UserMasterDataPermission | undefined>;
  revokePermission(userId: string): Promise<boolean>;
  getPendingPermissionRequests(): Promise<UserMasterDataPermission[]>;
  getApprovedPermissions(): Promise<UserMasterDataPermission[]>;
}

export class DatabaseStorage implements IStorage {
  private db: any;
  
 constructor() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  // Safer masking (non-greedy) — won't swallow username when logging
  const masked = raw.replace(/:(.+?)@/, ":*****@");
  console.log("[db] connecting to", masked);

  // Parse URL cleanly
  let sql_conn;
  try {
    const url = new URL(raw);

    const username = decodeURIComponent(url.username || "");
    const password = decodeURIComponent(url.password || "");
    const host = url.hostname;
    const port = Number(url.port || 5432);
    const database = url.pathname ? url.pathname.replace(/^\//, "") : "";

    console.log(`[db] parsed host=${host} port=${port} user=${username ? username[0] + "*****" : "unknown"} db=${database}`);

    // Connect using object config (avoids URL-encoding pitfalls)
    sql_conn = postgres({
      host,
      port,
      database,
      username,
      password,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  } catch (err) {
    console.error("[db] Failed to parse DATABASE_URL:", err);
    throw err;
  }

  this.db = drizzle(sql_conn);

  // test connection (promise chain allowed in constructor)
  sql_conn`SELECT 1`
    .then(() => console.log("[db] Connected to DB successfully"))
    .catch((err: unknown) => console.error("[[db] Initial connection failed:]", err));
}



  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users).set(userUpdate).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(users).where(eq(users.id, id));
      
      // Some drivers return different properties for affected rows
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Partners
  async getAllPartners(): Promise<Partner[]> {
    return await this.db.select().from(partners);
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const result = await this.db.select().from(partners).where(eq(partners.id, id)).limit(1);
    return result[0];
  }

  async createPartner(insertPartner: InsertPartner): Promise<Partner> {
    const result = await this.db.insert(partners).values(insertPartner).returning();
    return result[0];
  }

  // Leads
  async getAllLeads(): Promise<Lead[]> {
    return await this.db.select().from(leads);
  }

  async getLeadsByOwner(userId: string, userRole: string): Promise<Lead[]> {
    if (userRole === 'admin') {
      // Admin can see all active leads (not rejected), sorted by most recently updated
      return await this.db.select().from(leads)
        .where(ne(leads.acceptanceStage, 'Rejected'))
        .orderBy(desc(leads.updatedAt));
    } else {
      // Get user's first name to match assignments
      const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
      const userFirstName = user[0]?.firstName;
      
      if (userFirstName) {
        // Create the full name that would match the Lead/Co-Lead assignment
        const userFullNames = [
          'Pankaj Karna', 'Nitin Gupta', 'Aakash Jain', 
          'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh'
        ];
        const matchingName = userFullNames.find(name => 
          name.toLowerCase().startsWith(userFirstName.toLowerCase())
        );
        
        if (matchingName) {
          // Get leads where user is owner OR assigned as Lead OR assigned as Co-Lead
          const ownedLeads = await this.db.select().from(leads)
            .where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, 'Rejected')))
            .orderBy(desc(leads.updatedAt));
            
          const assignedLeads = await this.db.select().from(leads)
            .where(and(
              ne(leads.acceptanceStage, 'Rejected'),
              or(
                eq(leads.leadAssignment, matchingName),
                eq(leads.coLeadAssignment, matchingName)
              )
            ))
            .orderBy(desc(leads.updatedAt));
            
          // Combine and deduplicate by ID, then sort by updatedAt
          const allLeads = [...ownedLeads, ...assignedLeads];
          const uniqueLeads = allLeads.filter((lead, index, arr) => 
            arr.findIndex(l => l.id === lead.id) === index
          );
          
          // Sort by updatedAt descending (most recent first)
          return uniqueLeads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
      
      // Fallback to only owned leads, sorted by most recently updated
      return await this.db.select().from(leads)
        .where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, 'Rejected')))
        .orderBy(desc(leads.updatedAt));
    }
  }

  async getColdLeadsByOwner(userId: string, userRole: string): Promise<Lead[]> {
    if (userRole === 'admin') {
      // Admin can see all cold leads (rejected)
      return await this.db.select().from(leads).where(eq(leads.acceptanceStage, 'Rejected'));
    } else {
      // Regular users can only see their own cold leads
      return await this.db.select().from(leads)
        .where(and(eq(leads.ownerId, userId), eq(leads.acceptanceStage, 'Rejected')));
    }
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const result = await this.db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0];
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const result = await this.db.insert(leads).values(insertLead).returning();
    return result[0];
  }

  async updateLead(id: string, leadUpdate: Partial<Lead>): Promise<Lead | undefined> {
    const result = await this.db.update(leads)
      .set({ ...leadUpdate, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return result[0];
  }

  async deleteLead(id: string): Promise<boolean> {
    try {
      // First check if lead exists
      const existingLead = await this.getLead(id);
      if (!existingLead) {
        return false;
      }

      // If this lead was converted to a client, also delete the client
      if (existingLead.convertedClientId) {
        // First remove the reference from the lead to avoid circular dependency
        await this.db.update(leads)
          .set({ convertedClientId: null })
          .where(eq(leads.id, id));
        
        // Then delete the client
        await this.db.delete(clients).where(eq(clients.id, existingLead.convertedClientId));
      }

      // Delete the lead
      await this.db.delete(leads).where(eq(leads.id, id));
      
      // Verify deletion
      const deletedLead = await this.getLead(id);
      return !deletedLead;
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
  }

  async convertLeadToClient(leadId: string): Promise<{ lead: Lead; client: any } | undefined> {
    const lead = await this.getLead(leadId);
    if (!lead) return undefined;

    // Create client from lead data (copy, don't move)
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
      status: 'NDA Shared' as const,
      assignedTo: lead.assignedTo,
      leadAssignment: lead.leadAssignment || null,
      coLeadAssignment: lead.coLeadAssignment || null,
      convertedFromLeadId: leadId,
      ownerId: lead.ownerId,
      notes: lead.notes || `Copied from lead on ${new Date().toISOString()}`,
    };

    const client = await this.createClient(clientData);
    
    // Update lead to mark as converted but keep the lead active
    const updatedLead = await this.updateLead(leadId, { 
      isConverted: 'true', 
      convertedClientId: client.id 
    });

    return { lead: updatedLead!, client };
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return await this.db.select().from(clients);
  }

  async getClientsByOwner(userId: string, userRole: string): Promise<Client[]> {
    if (userRole === 'admin') {
      // Admin can see all active clients (exclude past clients), sorted by most recently updated
      return await this.db.select().from(clients)
        .where(and(
          ne(clients.status, 'Transaction closed'),
          ne(clients.status, 'Client Dropped')
        ))
        .orderBy(desc(clients.updatedAt));
    } else {
      // Get user's first name to match assignments
      const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
      const userFirstName = user[0]?.firstName;
      
      if (userFirstName) {
        // Create the full name that would match the Lead/Co-Lead assignment
        const userFullNames = [
          'Pankaj Karna', 'Nitin Gupta', 'Aakash Jain', 
          'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh'
        ];
        const matchingName = userFullNames.find(name => 
          name.toLowerCase().startsWith(userFirstName.toLowerCase())
        );
        
        if (matchingName) {
          // Get clients where user is owner OR assigned as Lead OR assigned as Co-Lead (exclude past clients)
          const ownedClients = await this.db.select().from(clients)
            .where(and(
              eq(clients.ownerId, userId),
              ne(clients.status, 'Transaction closed'),
              ne(clients.status, 'Client Dropped')
            ))
            .orderBy(desc(clients.updatedAt));
            
          const assignedClients = await this.db.select().from(clients)
            .where(and(
              or(
                eq(clients.leadAssignment, matchingName),
                eq(clients.coLeadAssignment, matchingName)
              ),
              ne(clients.status, 'Transaction closed'),
              ne(clients.status, 'Client Dropped')
            ))
            .orderBy(desc(clients.updatedAt));
            
          // Combine and deduplicate by ID, then sort by updatedAt
          const allClients = [...ownedClients, ...assignedClients];
          const uniqueClients = allClients.filter((client, index, arr) => 
            arr.findIndex(c => c.id === client.id) === index
          );
          
          // Sort by updatedAt descending (most recent first)
          return uniqueClients.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
      
      // Fallback to only owned clients (exclude past clients), sorted by most recently updated
      return await this.db.select().from(clients)
        .where(and(
          eq(clients.ownerId, userId),
          ne(clients.status, 'Transaction closed'),
          ne(clients.status, 'Client Dropped')
        ))
        .orderBy(desc(clients.updatedAt));
    }
  }

  async getPastClientsByOwner(userId: string, userRole: string): Promise<Client[]> {
    if (userRole === 'admin') {
      // Admin can see all past clients (transaction closed or dropped)
      return await this.db.select().from(clients).where(
        or(eq(clients.status, 'Transaction closed'), eq(clients.status, 'Client Dropped'))
      );
    } else {
      // Regular users can only see their own past clients
      return await this.db.select().from(clients)
        .where(and(
          eq(clients.ownerId, userId), 
          or(eq(clients.status, 'Transaction closed'), eq(clients.status, 'Client Dropped'))
        ));
    }
  }

  async getRecentClientsByOwner(userId: string, userRole: string, limit: number = 5): Promise<Client[]> {
    if (userRole === 'admin') {
      // Admin can see recent clients from all users
      return await this.db.select().from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(limit);
    } else {
      // Regular users can only see their own recent clients
      return await this.db.select().from(clients)
        .where(eq(clients.ownerId, userId))
        .orderBy(desc(clients.createdAt))
        .limit(limit);
    }
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await this.db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await this.db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: string, clientUpdate: Partial<Client>): Promise<Client | undefined> {
    const result = await this.db.update(clients)
      .set({ ...clientUpdate, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      // First check if client exists
      const existingClient = await this.getClient(id);
      if (!existingClient) {
        return false;
      }

      // First update any leads that reference this client to remove the reference
      await this.db.update(leads)
        .set({ convertedClientId: null })
        .where(eq(leads.convertedClientId, id));

      // Delete the client
      await this.db.delete(clients).where(eq(clients.id, id));
      
      // Verify deletion
      const deletedClient = await this.getClient(id);
      return !deletedClient;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  // Project Comments
  async getProjectComments(projectId: string): Promise<any[]> {
    const result = await this.db
      .select({
        id: projectComments.id,
        projectId: projectComments.projectId,
        userId: projectComments.userId,
        parentCommentId: projectComments.parentCommentId,
        commentType: projectComments.commentType,
        content: projectComments.content,
        createdAt: projectComments.createdAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(projectComments)
      .leftJoin(users, eq(projectComments.userId, users.id))
      .where(eq(projectComments.projectId, projectId))
      .orderBy(projectComments.createdAt);
    
    // Organize comments into nested structure
    const flatComments = result.map((comment: any) => ({
      ...comment,
      userName: comment.userFirstName && comment.userLastName 
        ? `${comment.userFirstName} ${comment.userLastName}` 
        : 'Unknown User',
      replies: []
    }));

    const topLevelComments = flatComments.filter((comment: any) => !comment.parentCommentId);
    const replyComments = flatComments.filter((comment: any) => comment.parentCommentId);

    // Add replies to their parent comments
    replyComments.forEach((reply: any) => {
      const parentComment = topLevelComments.find((comment: any) => comment.id === reply.parentCommentId);
      if (parentComment) {
        parentComment.replies.push(reply);
      }
    });

    return topLevelComments;
  }

  async createProjectComment(comment: InsertProjectComment): Promise<ProjectComment> {
    const result = await this.db.insert(projectComments).values(comment).returning();
    return result[0];
  }

  async addProjectComment(comment: InsertProjectComment): Promise<ProjectComment> {
    return await this.createProjectComment(comment);
  }

  async deleteProjectComment(commentId: string): Promise<boolean> {
    try {
      // Delete the comment
      await this.db.delete(projectComments).where(eq(projectComments.id, commentId));
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Partner-specific leads (for affiliate tabs)
  async getLeadsByInboundSource(source: string): Promise<Lead[]> {
    return await this.db.select().from(leads).where(eq(leads.inboundSource, source as any));
  }

  // Projects
  async getAllProjects(): Promise<any[]> {
    return await this.db
      .select({
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
        ownerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        ownerEmail: users.email,
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id));
  }

  async getProjectsForUser(userId: string, userRole: string): Promise<any[]> {
    if (userRole === 'admin') {
      // Admins can see all projects with owner info
      return await this.getAllProjects();
    } else {
      // Regular users can only see projects they created with owner info
      return await this.db
        .select({
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
          ownerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          ownerEmail: users.email,
        })
        .from(projects)
        .leftJoin(users, eq(projects.ownerId, users.id))
        .where(eq(projects.ownerId, userId));
    }
  }

  async getProject(id: string): Promise<Project | undefined> {
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
      updatedAt: projects.updatedAt,
    }).from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await this.db.insert(projects).values(insertProject).returning();
    return result[0];
  }

  async updateProject(id: string, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ ...projectUpdate, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async getProjectsByOwner(ownerId: string): Promise<Project[]> {
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
      updatedAt: projects.updatedAt,
    }).from(projects).where(eq(projects.ownerId, ownerId));
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      // First check if project exists
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        return false;
      }

      // Delete all project comments
      await this.db.delete(projectComments).where(eq(projectComments.projectId, id));
      
      // Delete all project members
      await this.db.delete(projectMembers).where(eq(projectMembers.projectId, id));
      
      // Finally delete the project
      await this.db.delete(projects).where(eq(projects.id, id));
      
      // Verify deletion by checking if project still exists
      const deletedProject = await this.getProject(id);
      return !deletedProject;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Project Members
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return await this.db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  }

  async addProjectMember(insertMember: InsertProjectMember): Promise<ProjectMember> {
    const result = await this.db.insert(projectMembers).values(insertMember).returning();
    return result[0];
  }



  // Dashboard stats
  async getDashboardStats(userId: string, userRole: string): Promise<{
    totalLeads: number;
    activeClients: number;
    activeProjects: number;
  }> {
    try {
      // Filter leads and clients by user ownership AND active status
      let totalLeads, activeClients;
      
      if (userRole === 'admin') {
        // Admins can see all active leads (not rejected) and all active clients (exclude past clients)
        totalLeads = await this.db.select().from(leads).where(ne(leads.acceptanceStage, 'Rejected'));
        activeClients = await this.db.select().from(clients).where(and(
          ne(clients.status, 'Transaction closed'),
          ne(clients.status, 'Client Dropped')
        ));
      } else {
        // Get user's first name to match assignments for both leads and clients
        const user = await this.db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1);
        const userFirstName = user[0]?.firstName;
        
        if (userFirstName) {
          const userFullNames = [
            'Pankaj Karna', 'Nitin Gupta', 'Aakash Jain', 
            'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh'
          ];
          const matchingName = userFullNames.find(name => 
            name.toLowerCase().startsWith(userFirstName.toLowerCase())
          );
          
          if (matchingName) {
            // Get leads where user is owner OR assigned as Lead OR assigned as Co-Lead
            const ownedLeads = await this.db.select().from(leads)
              .where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, 'Rejected')));
              
            const assignedLeads = await this.db.select().from(leads)
              .where(and(
                ne(leads.acceptanceStage, 'Rejected'),
                or(
                  eq(leads.leadAssignment, matchingName),
                  eq(leads.coLeadAssignment, matchingName)
                )
              ));
              
            const allLeads = [...ownedLeads, ...assignedLeads];
            const uniqueLeads = allLeads.filter((lead, index, arr) => 
              arr.findIndex(l => l.id === lead.id) === index
            );
            totalLeads = uniqueLeads;
            
            // Get clients where user is owner OR assigned as Lead OR assigned as Co-Lead (exclude past clients)
            const ownedClients = await this.db.select().from(clients)
              .where(and(
                eq(clients.ownerId, userId),
                ne(clients.status, 'Transaction closed'),
                ne(clients.status, 'Client Dropped')
              ));
              
            const assignedClients = await this.db.select().from(clients)
              .where(and(
                or(
                  eq(clients.leadAssignment, matchingName),
                  eq(clients.coLeadAssignment, matchingName)
                ),
                ne(clients.status, 'Transaction closed'),
                ne(clients.status, 'Client Dropped')
              ));
              
            const allClients = [...ownedClients, ...assignedClients];
            const uniqueClients = allClients.filter((client, index, arr) => 
              arr.findIndex(c => c.id === client.id) === index
            );
            activeClients = uniqueClients;
          } else {
            totalLeads = await this.db.select().from(leads)
              .where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, 'Rejected')));
            activeClients = await this.db.select().from(clients)
              .where(and(
                eq(clients.ownerId, userId),
                ne(clients.status, 'Transaction closed'),
                ne(clients.status, 'Client Dropped')
              ));
          }
        } else {
          totalLeads = await this.db.select().from(leads)
            .where(and(eq(leads.ownerId, userId), ne(leads.acceptanceStage, 'Rejected')));
          activeClients = await this.db.select().from(clients)
            .where(and(
              eq(clients.ownerId, userId),
              ne(clients.status, 'Transaction closed'),
              ne(clients.status, 'Client Dropped')
            ));
        }
      }
      
      // Projects should be filtered by user role like in getProjectsForUser
      let userProjects: Project[];
      if (userRole === 'admin') {
        // Admins can see all projects
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
          updatedAt: projects.updatedAt,
        }).from(projects);
      } else {
        // Regular users can only see projects they created
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
          updatedAt: projects.updatedAt,
        }).from(projects).where(eq(projects.ownerId, userId));
      }
      
      console.log(`Dashboard stats for ${userRole} ${userId}: found ${userProjects.length} total projects`);
      
      const activeProjects = userProjects.filter((p: Project) => 
        p.status === 'planning' || p.status === 'in_progress' || p.status === 'on_hold'
      );
      
      return {
        totalLeads: totalLeads.length,
        activeClients: activeClients.length,
        activeProjects: activeProjects.length,
      };
    } catch (error) {
      console.error('Dashboard stats error in storage:', error);
      throw error;
    }
  }

  // Client Comments methods
  async getClientComments(clientId: string): Promise<any[]> {
    const result = await this.db
      .select({
        id: clientComments.id,
        clientId: clientComments.clientId,
        userId: clientComments.userId,
        parentCommentId: clientComments.parentCommentId,
        commentType: clientComments.commentType,
        content: clientComments.content,
        createdAt: clientComments.createdAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
      })
      .from(clientComments)
      .leftJoin(users, eq(clientComments.userId, users.id))
      .where(eq(clientComments.clientId, clientId))
      .orderBy(clientComments.createdAt);

    // Organize comments into nested structure
    const flatComments = result.map((comment: any) => ({
      ...comment,
      replies: []
    }));

    const topLevelComments = flatComments.filter((comment: any) => !comment.parentCommentId);
    const replyComments = flatComments.filter((comment: any) => comment.parentCommentId);

    // Add replies to their parent comments
    replyComments.forEach((reply: any) => {
      const parentComment = topLevelComments.find((comment: any) => comment.id === reply.parentCommentId);
      if (parentComment) {
        parentComment.replies.push(reply);
      }
    });

    return topLevelComments;
  }

  async addClientComment(comment: InsertClientComment): Promise<ClientComment> {
    const result = await this.db.insert(clientComments).values(comment).returning();
    return result[0];
  }

  async deleteClientComment(commentId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(clientComments).where(eq(clientComments.id, commentId));
      return true;
    } catch (error) {
      console.error('Error deleting client comment:', error);
      return false;
    }
  }

  // Missing interface methods for Lead/Co-Lead assignment filtering
  async getLeadsByLeadAssignment(assigneeName: string, userRole: string): Promise<Lead[]> {
    if (userRole === 'admin') {
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

  async getClientsByLeadAssignment(assigneeName: string, userRole: string): Promise<Client[]> {
    if (userRole === 'admin') {
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
  async getAllFunds(): Promise<FundTracker[]> {
    return await this.db.select().from(fundTracker).orderBy(desc(fundTracker.createdAt));
  }

  async getFund(id: string): Promise<FundTracker | undefined> {
    const result = await this.db.select().from(fundTracker).where(eq(fundTracker.id, id)).limit(1);
    return result[0];
  }

  async createFund(insertFund: InsertFundTracker): Promise<FundTracker> {
    const result = await this.db.insert(fundTracker).values(insertFund).returning();
    return result[0];
  }

  async updateFund(id: string, fundUpdate: Partial<FundTracker>): Promise<FundTracker | undefined> {
    const result = await this.db.update(fundTracker).set(fundUpdate).where(eq(fundTracker.id, id)).returning();
    return result[0];
  }

  async deleteFund(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(fundTracker).where(eq(fundTracker.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error('Error deleting fund:', error);
      return false;
    }
  }

  // Team Members methods
  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await this.db.select().from(teamMembers).orderBy(teamMembers.name);
  }

  async getActiveTeamMembers(): Promise<TeamMember[]> {
    return await this.db.select().from(teamMembers)
      .where(eq(teamMembers.isActive, 'true'))
      .orderBy(teamMembers.name);
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const result = await this.db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return result[0];
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await this.db.insert(teamMembers).values(member).returning();
    return result[0];
  }

  async updateTeamMember(id: string, memberUpdate: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const result = await this.db.update(teamMembers)
      .set({ ...memberUpdate, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(teamMembers).where(eq(teamMembers.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error('Error deleting team member:', error);
      return false;
    }
  }

  // Client Master Data methods
  async getAllClientMasterData(userId: string, userRole: string): Promise<ClientMasterData[]> {
    if (userRole === 'admin') {
      return await this.db.select().from(clientMasterData).orderBy(clientMasterData.name);
    }
    
    const permission = await this.getUserMasterDataPermission(userId);
    if (permission?.hasViewAccess === 'true') {
      return await this.db.select().from(clientMasterData).orderBy(clientMasterData.name);
    }
    
    return [];
  }

  async getClientMasterData(id: string): Promise<ClientMasterData | undefined> {
    const result = await this.db.select().from(clientMasterData).where(eq(clientMasterData.id, id)).limit(1);
    return result[0];
  }

  async createClientMasterData(data: InsertClientMasterData): Promise<ClientMasterData> {
    const result = await this.db.insert(clientMasterData).values(data).returning();
    return result[0];
  }

  async updateClientMasterData(id: string, data: Partial<ClientMasterData>): Promise<ClientMasterData | undefined> {
    const result = await this.db.update(clientMasterData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientMasterData.id, id))
      .returning();
    return result[0];
  }

  async deleteClientMasterData(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(clientMasterData).where(eq(clientMasterData.id, id));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error('Error deleting client master data:', error);
      return false;
    }
  }

  // User Master Data Permissions methods
  async getUserMasterDataPermission(userId: string): Promise<UserMasterDataPermission | undefined> {
    const result = await this.db.select()
      .from(userMasterDataPermissions)
      .where(eq(userMasterDataPermissions.userId, userId))
      .limit(1);
    return result[0];
  }

  async createPermissionRequest(userId: string): Promise<UserMasterDataPermission> {
    const existing = await this.getUserMasterDataPermission(userId);
    if (existing) {
      const result = await this.db.update(userMasterDataPermissions)
        .set({ requestedAt: new Date(), updatedAt: new Date() })
        .where(eq(userMasterDataPermissions.userId, userId))
        .returning();
      return result[0];
    }
    
    const result = await this.db.insert(userMasterDataPermissions)
      .values({
        userId,
        hasViewAccess: 'false',
        requestedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async approvePermissionRequest(userId: string, approvedBy: string): Promise<UserMasterDataPermission | undefined> {
    const result = await this.db.update(userMasterDataPermissions)
      .set({
        hasViewAccess: 'true',
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      })
      .where(eq(userMasterDataPermissions.userId, userId))
      .returning();
    return result[0];
  }

  async revokePermission(userId: string): Promise<boolean> {
    try {
      const result = await this.db.update(userMasterDataPermissions)
        .set({
          hasViewAccess: 'false',
          approvedAt: null,
          approvedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(userMasterDataPermissions.userId, userId));
      return result.rowCount > 0 || result.count > 0 || result.changes > 0;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  async getPendingPermissionRequests(): Promise<UserMasterDataPermission[]> {
    return await this.db.select()
      .from(userMasterDataPermissions)
      .where(and(
        eq(userMasterDataPermissions.hasViewAccess, 'false'),
        isNotNull(userMasterDataPermissions.requestedAt)
      ))
      .orderBy(desc(userMasterDataPermissions.requestedAt));
  }

  async getApprovedPermissions(): Promise<UserMasterDataPermission[]> {
    return await this.db.select()
      .from(userMasterDataPermissions)
      .where(eq(userMasterDataPermissions.hasViewAccess, 'true'))
      .orderBy(desc(userMasterDataPermissions.approvedAt));
  }
}

export const storage = new DatabaseStorage();
