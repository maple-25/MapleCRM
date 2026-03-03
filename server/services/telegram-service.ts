import { Bot, InlineKeyboard, Context } from "grammy";

interface TelegramConfig {
  botToken: string;
  botSecretKey: string;
  apiUrl: string;
}

// Store conversation state for each user
interface LeadSession {
  step: string;
  data: Record<string, string>;
}

const sessions = new Map<number, LeadSession>();

export class TelegramService {
  private bot: Bot;
  private reminderInterval: NodeJS.Timeout | null = null;
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.bot = new Bot(config.botToken);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.command("start", async (ctx) => {
      await ctx.reply(
        "👋 Welcome to Maple Advisors CRM Bot!\n\n" +
        "Use /link to connect your CRM account.\n\n" +
        "📋 Leads\n" +
        "/newlead - Add a new lead\n" +
        "/viewlead - View full details of a lead\n" +
        "/editlead - Edit an existing lead\n" +
        "/converttoclient - Convert lead to client\n" +
        "/deletelead - Delete a lead\n\n" +
        "🤝 Clients\n" +
        "/clients - View your clients list\n" +
        "/viewclient - View full details of a client\n" +
        "/editclient - Edit a client\n" +
        "/deleteclient - Delete a client\n\n" +
        "📝 Notes\n" +
        "/addnote - Add a note to a lead or client\n\n" +
        "📊 Stats\n" +
        "/stats - Basic lead statistics\n" +
        "/mystats - Detailed stats breakdown\n\n" +
        "🔔 Reminders\n" +
        "/remind - Set a new reminder\n" +
        "/myreminders - View your active reminders\n\n" +
        "Type /help anytime to see this list again."
      );
    });

        this.bot.command("help", async (ctx) => {
          await ctx.reply(
            "📋 Available Commands:\n\n" +
            "🔗 Account\n" +
            "/link - Link your Telegram to CRM\n\n" +
            "📋 Leads\n" +
            "/newlead - Add a new lead\n" +
            "/viewlead - View full details of a lead\n" +
            "/editlead - Edit an existing lead\n" +
            "/converttoclient - Convert lead to client\n" +
            "/deletelead - Delete a lead\n\n" +
            "🤝 Clients\n" +
            "/clients - View your clients list\n" +
            "/viewclient - View full details of a client\n" +
            "/editclient - Edit a client\n" +
            "/deleteclient - Delete a client\n\n" +
            "📝 Notes\n" +
            "/addnote - Add a note to a lead or client\n\n" +
            "📊 Stats\n" +
            "/stats - Basic lead statistics\n" +
            "/mystats - Detailed stats breakdown\n\n" +
            "🔔 Reminders\n" +
            "/remind - Set a new reminder\n" +
            "/myreminders - View your active reminders\n\n" +
            "❌ /cancel - Cancel current operation"
          );
        });

    // Handle /cancel command
    this.bot.command("cancel", async (ctx) => {
      const userId = ctx.from?.id;
      if (userId && sessions.has(userId)) {
        sessions.delete(userId);
        await ctx.reply("❌ Operation cancelled.");
      } else {
        await ctx.reply("Nothing to cancel.");
      }
    });

    // Handle /link command
    this.bot.command("link", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      sessions.set(userId, { step: "link_email", data: {} });
      await ctx.reply(
        "🔗 Let's link your CRM account!\n\n" +
        "Please enter your CRM email address:"
      );
    });

    // Handle /newlead command
    this.bot.command("newlead", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Check if user is linked
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) {
        await ctx.reply(
          "❌ You need to link your account first.\n" +
          "Use /link to connect your CRM account."
        );
        return;
      }

      // Start lead creation flow
      sessions.set(userId, { step: "lead_company", data: {} });
      await ctx.reply("📋 Let's add a new lead!\n\nWhat is the company name?");
    });

    // Handle /editlead command
    this.bot.command("editlead", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) {
        await ctx.reply("❌ You need to link your account first.\nUse /link");
        return;
      }

      sessions.set(userId, { step: "edit_select_lead", data: {} });
      await this.showLeadsToEdit(ctx, userId.toString());
    });

    // Handle /converttoclient command
    this.bot.command("converttoclient", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) {
        await ctx.reply("❌ You need to link your account first.\nUse /link");
        return;
      }

      sessions.set(userId, { step: "convert_select_lead", data: {} });
      await this.showLeadsToConvert(ctx, userId.toString());
    });

    // Handle /deletelead command
    this.bot.command("deletelead", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) {
        await ctx.reply("❌ You need to link your account first.\nUse /link");
        return;
      }

      sessions.set(userId, { step: "delete_select_lead", data: {} });
      await this.showLeadsToDelete(ctx, userId.toString());
    });

    // Handle /stats command
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
          await ctx.reply("❌ You're not linked yet.\nUse /link to connect your account.");
          return;
        }

        const { stats, user } = data;
        await ctx.reply(
          `📊 Stats for ${user.firstName} ${user.lastName}\n\n` +
          `Total Leads: ${stats.totalLeads}\n` +
          `├─ Initial Discussion: ${stats.byStatus.initialDiscussion}\n` +
          `├─ NDA: ${stats.byStatus.nda}\n` +
          `└─ Engagement: ${stats.byStatus.engagement}\n\n` +
          `✅ Converted to Clients: ${stats.converted}`
        );
      } catch (error) {
        await ctx.reply("❌ Failed to fetch stats. Please try again.");
      }
    });
    // Handle /clients command
    this.bot.command("clients", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      await this.showClientsList(ctx, userId.toString());
    });

    // Handle /viewlead command
    this.bot.command("viewlead", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "viewlead_select", data: {} });
      await this.showLeadsToView(ctx, userId.toString());
    });

    // Handle /viewclient command
    this.bot.command("viewclient", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "viewclient_select", data: {} });
      await this.showClientsToView(ctx, userId.toString());
    });

    // Handle /editclient command
    this.bot.command("editclient", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "editclient_select", data: {} });
      await this.showClientsToEdit(ctx, userId.toString());
    });

    // Handle /addnote command
    this.bot.command("addnote", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "note_pick_type", data: {} });
      const keyboard = new InlineKeyboard().text("Lead", "notetype_lead").text("Client", "notetype_client");
      await ctx.reply("📝 Add a note to a:", { reply_markup: keyboard });
    });

    // Handle /deleteclient command
    this.bot.command("deleteclient", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "deleteclient_select", data: {} });
      await this.showClientsToDelete(ctx, userId.toString());
    });

    // Handle /mystats command
    this.bot.command("mystats", async (ctx) => {
      const platformUserId = ctx.from?.id.toString();
      if (!platformUserId) return;
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/mystats/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success) { await ctx.reply("❌ You're not linked yet. Use /link"); return; }
        const { leads, clients, user } = data;
        const bySectorText = Object.entries(clients.bySector).map(([s, n]) => `  ${s}: ${n}`).join("\n") || "  None";
        await ctx.reply(
          `📊 Stats for ${user.firstName} ${user.lastName}\n\n` +
          `📋 LEADS (${leads.total} active)\n` +
          `├─ Initial Discussion: ${leads.byStatus.initialDiscussion}\n` +
          `├─ NDA: ${leads.byStatus.nda}\n` +
          `├─ Engagement: ${leads.byStatus.engagement}\n` +
          `├─ Accepted: ${leads.byAcceptance.accepted}\n` +
          `├─ Rejected: ${leads.byAcceptance.rejected}\n` +
          `└─ Converted to Clients: ${leads.converted}\n\n` +
          `🤝 CLIENTS (${clients.total} total)\n` +
          `By Sector:\n${bySectorText}`
        );
      } catch { await ctx.reply("❌ Failed to fetch stats. Please try again."); }
    });
    // Handle /remind command
    this.bot.command("remind", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      sessions.set(userId, { step: "remind_pick_type", data: {} });
      const keyboard = new InlineKeyboard()
        .text("Link to Lead", "remindtype_lead")
        .text("Link to Client", "remindtype_client").row()
        .text("No Link (free reminder)", "remindtype_none");
      await ctx.reply("🔔 Set a reminder\n\nLink this reminder to a record?", { reply_markup: keyboard });
    });

    // Handle /myreminders command
    this.bot.command("myreminders", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const isLinked = await this.checkUserLinked(userId.toString());
      if (!isLinked) { await ctx.reply("❌ You need to link your account first.\nUse /link"); return; }
      await this.showMyReminders(ctx, userId.toString());
    });

    // Handle callback queries (button clicks)
    this.bot.on("callback_query:data", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const session = sessions.get(userId);
      if (!session) {
        await ctx.answerCallbackQuery("Session expired. Please start again.");
        return;
      }

      const data = ctx.callbackQuery.data;
      await ctx.answerCallbackQuery();

      await this.handleCallbackQuery(ctx, session, data, userId);
    });

    // Handle text messages
    this.bot.on("message:text", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const text = ctx.message.text;

      // Skip commands
      if (text.startsWith("/")) return;

      const session = sessions.get(userId);
      if (!session) {
        await ctx.reply(
          "ℹ️ Use /newlead to add a lead or /help to see commands."
        );
        return;
      }

      await this.handleTextInput(ctx, session, text, userId);
    });
  }

  // ============================================
  // Handle Button Clicks
  // ============================================

  private async handleCallbackQuery(ctx: any, session: LeadSession, data: string, userId: number) {
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
          await ctx.reply("👤 Who is the Point of Contact (POC)?");
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
          await ctx.reply("📤 Who referred this lead? (Enter name/firm):");
        }
        break;

      case "lead_inbound_source":
        if (data === "inbound_Others") {
          session.step = "lead_inbound_source_custom";
          sessions.set(userId, session);
          await ctx.reply("Please type the inbound source:");
        } else {
          session.data.inboundSource = data.replace("inbound_", "");
          session.step = "lead_assignment";
          sessions.set(userId, session);
          await this.askLeadAssignment(ctx);
        }
        break;

      case "lead_assignment":
        session.data.leadAssignment = data.replace("assign_", "");
        session.step = "ask_colead";
        sessions.set(userId, session);
        await this.askWantCoLead(ctx);
        break;

      case "ask_colead":
        if (data === "colead_yes") {
          session.step = "co_lead_assignment";
          sessions.set(userId, session);
          await this.askCoLeadAssignment(ctx);
        } else {
          sessions.delete(userId);
          await this.createLeadFinal(ctx, session, userId);
        }
        break;

      case "co_lead_assignment":
        session.data.coLeadAssignment = data.replace("coassign_", "");
        sessions.delete(userId);
        await this.createLeadFinal(ctx, session, userId);
        break;

      // EDIT LEAD FLOW
      case "edit_select_lead":
        session.data.leadId = data.replace("editlead_", "");
        session.step = "edit_select_field";
        sessions.set(userId, session);
        await this.askWhatToEdit(ctx);
        break;

      case "edit_select_field":
        session.data.editField = data.replace("editfield_", "");
        session.step = `edit_new_${data.replace("editfield_", "")}`;
        sessions.set(userId, session);
        await this.askNewValue(ctx, session.data.editField);
        break;

      case "edit_new_status":
        session.data.newStatus = data.replace("status_", "");
        sessions.delete(userId);
        await this.updateLeadField(ctx, session, userId);
        break;

      case "edit_new_acceptance":
        session.data.newAcceptance = data.replace("acceptance_", "");
        sessions.delete(userId);
        await this.updateLeadField(ctx, session, userId);
        break;

      case "edit_new_lead":
        session.data.newLead = data.replace("newlead_", "");
        sessions.delete(userId);
        await this.updateLeadField(ctx, session, userId);
        break;

      case "edit_new_colead":
        session.data.newCoLead = data.replace("newcolead_", "");
        sessions.delete(userId);
        await this.updateLeadField(ctx, session, userId);
        break;

      // CONVERT TO CLIENT FLOW
      case "convert_select_lead":
        session.data.leadId = data.replace("convertlead_", "");
        session.step = "convert_confirm";
        sessions.set(userId, session);
        await this.confirmConversion(ctx, session);
        break;

      case "convert_confirm":
        if (data === "convert_yes") {
          sessions.delete(userId);
          await this.convertLeadToClient(ctx, session, userId);
        } else {
          sessions.delete(userId);
          await ctx.reply("❌ Conversion cancelled.");
        }
        break;

      // DELETE LEAD FLOW
      case "delete_select_lead":
        session.data.leadId = data.replace("deletelead_", "");
        session.step = "delete_confirm";
        sessions.set(userId, session);
        await this.confirmDeletion(ctx, session);
        break;

      case "delete_confirm":
        if (data === "delete_yes") {
          sessions.delete(userId);
          await this.deleteLead(ctx, session, userId);
        } else {
          sessions.delete(userId);
          await ctx.reply("❌ Deletion cancelled.");
        }
        break;

      // VIEW LEAD
      case "viewlead_select":
        session.data.leadId = data.replace("viewlead_", "");
        sessions.delete(userId);
        await this.showLeadDetail(ctx, session.data.leadId);
        break;

      // VIEW CLIENT
      case "viewclient_select":
        session.data.clientId = data.replace("viewclient_", "");
        sessions.delete(userId);
        await this.showClientDetail(ctx, session.data.clientId);
        break;

      // EDIT CLIENT FLOW
      case "editclient_select":
        session.data.clientId = data.replace("editclient_", "");
        session.step = "editclient_field";
        sessions.set(userId, session);
        await this.askWhatToEditClient(ctx);
        break;

      case "editclient_field":
        session.data.editField = data.replace("editclientfield_", "");
        session.step = `editclient_new_${session.data.editField}`;
        sessions.set(userId, session);
        await this.askNewClientValue(ctx, session.data.editField);
        break;

      case "editclient_new_status":
        session.data.newStatus = data.replace("cstatus_", "");
        sessions.delete(userId);
        await this.updateClientField(ctx, session, userId);
        break;

      case "editclient_new_lead":
        session.data.newLead = data.replace("clead_", "");
        sessions.delete(userId);
        await this.updateClientField(ctx, session, userId);
        break;

      case "editclient_new_colead":
        session.data.newCoLead = data.replace("ccolead_", "");
        sessions.delete(userId);
        await this.updateClientField(ctx, session, userId);
        break;

      // ADD NOTE FLOW
      case "note_pick_type":
        session.data.noteType = data.replace("notetype_", "");
        session.step = "note_select_record";
        sessions.set(userId, session);
        if (session.data.noteType === "lead") {
          await this.showLeadsToAddNote(ctx, userId.toString());
        } else {
          await this.showClientsToAddNote(ctx, userId.toString());
        }
        break;

      case "note_select_record":
        session.data.recordId = data.replace("notelead_", "").replace("noteclient_", "");
        session.step = "note_type_text";
        sessions.set(userId, session);
        await ctx.reply("📝 Type your note:");
        break;

      // DELETE CLIENT FLOW
      case "deleteclient_select":
        session.data.clientId = data.replace("deleteclient_", "");
        session.step = "deleteclient_confirm";
        sessions.set(userId, session);
        await this.confirmClientDeletion(ctx, session);
        break;

      case "deleteclient_confirm":
        if (data === "deleteclient_yes") {
          sessions.delete(userId);
          await this.deleteClient(ctx, session, userId);
        } else {
          sessions.delete(userId);
          await ctx.reply("❌ Deletion cancelled.");
        }
        break;

      // REMIND FLOW
      case "remind_pick_type":
        session.data.linkedType = data.replace("remindtype_", "");
        if (session.data.linkedType === "lead") {
          session.step = "remind_select_lead";
          sessions.set(userId, session);
          await this.showLeadsToRemind(ctx, userId.toString());
        } else if (session.data.linkedType === "client") {
          session.step = "remind_select_client";
          sessions.set(userId, session);
          await this.showClientsToRemind(ctx, userId.toString());
        } else {
          session.step = "remind_message";
          sessions.set(userId, session);
          await ctx.reply("📝 What should I remind you about?");
        }
        break;

      case "remind_select_lead":
        session.data.linkedId = data.replace("remindlead_", "");
        session.step = "remind_message";
        sessions.set(userId, session);
        await ctx.reply("📝 What should I remind you about?");
        break;

      case "remind_select_client":
        session.data.linkedId = data.replace("remindclient_", "");
        session.step = "remind_message";
        sessions.set(userId, session);
        await ctx.reply("📝 What should I remind you about?");
        break;

      case "remind_cancel":
        const reminderId = data.replace("cancelreminder_", "");
        try {
          const response = await fetch(`${this.config.apiUrl}/api/bot/reminders/${reminderId}`, {
            method: "DELETE",
            headers: { "X-Bot-Key": this.config.botSecretKey },
          });
          const result = await response.json();
          sessions.delete(userId);
          if (result.success) await ctx.answerCallbackQuery("✅ Reminder cancelled");
          else await ctx.answerCallbackQuery("❌ Failed to cancel");
          await this.showMyReminders(ctx, userId.toString());
        } catch { await ctx.answerCallbackQuery("❌ Error cancelling reminder"); }
        break;
    }
  }

  // ============================================
  // Handle Text Input
  // ============================================

  private async handleTextInput(ctx: any, session: LeadSession, text: string, userId: number) {
    switch (session.step) {

      // LINKING FLOW
      case "link_email":
        session.data.email = text.trim();
        session.step = "link_password";
        sessions.set(userId, session);
        await ctx.reply("🔑 Now enter your CRM password:");
        break;

      case "link_password":
        session.data.password = text.trim();
        sessions.delete(userId);
        await this.linkAccount(ctx, session.data.email, session.data.password);
        break;

      // LEAD CREATION FLOW
      case "lead_company":
        session.data.companyName = text.trim();
        session.step = "lead_sector";
        sessions.set(userId, session);
        await this.askSector(ctx);
        break;

      case "lead_sector_custom":
        session.data.sector = text.trim();
        session.step = "lead_transaction";
        sessions.set(userId, session);
        await this.askTransactionType(ctx);
        break;

      case "lead_transaction_custom":
        session.data.transactionType = text.trim();
        session.step = "lead_poc";
        sessions.set(userId, session);
        await ctx.reply("👤 Who is the Point of Contact (POC)?");
        break;

      case "lead_poc":
        session.data.clientPoc = text.trim();
        session.step = "lead_email";
        sessions.set(userId, session);
        await ctx.reply("📧 What is their email address?");
        break;

      case "lead_email":
        session.data.emailId = text.trim();
        session.step = "lead_phone";
        sessions.set(userId, session);
        await ctx.reply("📱 What is their phone number?");
        break;

      case "lead_phone":
        session.data.phoneNumber = text.trim();
        session.step = "lead_source_type";
        sessions.set(userId, session);
        await this.askSourceType(ctx);
        break;

      case "lead_outbound_source":
        session.data.outboundSource = text.trim();
        session.step = "lead_assignment";
        sessions.set(userId, session);
        await this.askLeadAssignment(ctx);
        break;

      case "lead_inbound_source_custom":
        session.data.inboundSource = text.trim();
        session.step = "lead_assignment";
        sessions.set(userId, session);
        await this.askLeadAssignment(ctx);
        break;

      case "note_type_text":
        session.data.noteText = text.trim();
        sessions.delete(userId);
        await this.submitNote(ctx, session, userId);
        break;

      case "remind_message":
        session.data.reminderMessage = text.trim();
        session.step = "remind_datetime";
        sessions.set(userId, session);
        await ctx.reply(
          "📅 When should I remind you?\n\n" +
          "Type the date and time in this format:\n" +
          "*DD Mon YYYY HH:MM AM/PM*\n\n" +
          "Examples:\n" +
          "• 25 Jan 2026 10:00 AM\n" +
          "• 3 Feb 2026 02:30 PM",
          { parse_mode: "Markdown" }
        );
        break;

      case "remind_datetime":
        const parsed = this.parseReminderDate(text.trim());
        if (!parsed) {
          await ctx.reply(
            "❌ Couldn't understand that date. Please use this format:\n" +
            "*25 Jan 2026 10:00 AM*",
            { parse_mode: "Markdown" }
          );
          return;
        }
        session.data.reminderAt = parsed.toISOString();
        sessions.delete(userId);
        await this.createReminder(ctx, session, userId);
        break;

      default:
        await ctx.reply("ℹ️ Use /newlead to add a lead or /help to see commands.");
        break;
    }
  }

  // ============================================
  // Ask Questions with Buttons
  // ============================================

  private async askSector(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Technology", "sector_Technology")
      .text("Manufacturing", "sector_Manufacturing").row()
      .text("Healthcare", "sector_Healthcare")
      .text("Energy", "sector_Energy").row()
      .text("Real Estate", "sector_Real Estate")
      .text("Consumer Goods", "sector_Consumer Goods").row()
      .text("Others", "sector_Others");

    await ctx.reply("🏭 Select the sector:", { reply_markup: keyboard });
  }

  private async askTransactionType(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("M&A", "tx_M&A")
      .text("Fundraising", "tx_Fundraising").row()
      .text("Debt Financing", "tx_Debt Financing")
      .text("Strategic Advisory", "tx_Strategic Advisory").row()
      .text("Others", "tx_Others");

    await ctx.reply("💼 Select the transaction type:", { reply_markup: keyboard });
  }

  private async askSourceType(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Inbound", "source_Inbound")
      .text("Outbound", "source_Outbound");

    await ctx.reply("📥 Is this an inbound or outbound lead?", { reply_markup: keyboard });
  }

  private async askInboundSource(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Kotak Wealth", "inbound_Kotak Wealth")
      .text("360 Wealth", "inbound_360 Wealth").row()
      .text("LGT", "inbound_LGT")
      .text("Pandion Partners", "inbound_Pandion Partners").row()
      .text("Others", "inbound_Others");

    await ctx.reply("📥 Select the inbound source:", { reply_markup: keyboard });
  }

  // ============================================
  // Lead & Co-Lead Assignment Methods
  // ============================================

  private async askLeadAssignment(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Pankaj Karna", "assign_Pankaj Karna")
      .text("Nitin Gupta", "assign_Nitin Gupta").row()
      .text("Aakash Jain", "assign_Aakash Jain")
      .text("Ojasva Chugh", "assign_Ojasva Chugh").row()
      .text("Ujjwal Jha", "assign_Ujjwal Jha")
      .text("Devapi Singh", "assign_Devapi Singh");

    await ctx.reply("👥 Who should be the Lead?", { reply_markup: keyboard });
  }

  private async askWantCoLead(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Yes", "colead_yes")
      .text("No", "colead_no");

    await ctx.reply("Do you want to assign a Co-Lead?", { reply_markup: keyboard });
  }

  private async askCoLeadAssignment(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Pankaj Karna", "coassign_Pankaj Karna")
      .text("Nitin Gupta", "coassign_Nitin Gupta").row()
      .text("Aakash Jain", "coassign_Aakash Jain")
      .text("Ojasva Chugh", "coassign_Ojasva Chugh").row()
      .text("Ujjwal Jha", "coassign_Ujjwal Jha")
      .text("Devapi Singh", "coassign_Devapi Singh");

    await ctx.reply("👥 Who should be the Co-Lead?", { reply_markup: keyboard });
  }

  // ============================================
  // Link Account
  // ============================================

  private async linkAccount(ctx: any, email: string, password: string) {
    const platformUserId = ctx.from?.id.toString();
    const platformUsername = ctx.from?.username;

    try {
      const response = await fetch(`${this.config.apiUrl}/api/bot/link-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Key": this.config.botSecretKey,
        },
        body: JSON.stringify({
          platform: "telegram",
          platformUserId,
          platformUsername,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await ctx.reply(
          `✅ Account linked successfully!\n\n` +
          `Welcome, ${data.user.firstName} ${data.user.lastName}!\n\n` +
          `You can now:\n` +
          `• Use /newlead to add leads\n` +
          `• Use /stats to view your stats`
        );
      } else {
        await ctx.reply(
          `❌ ${data.message}\n\n` +
          `Please try again with /link`
        );
      }
    } catch (error) {
      await ctx.reply("❌ Failed to link account. Please try again with /link");
    }
  }

  // ============================================
  // Create Lead
  // ============================================

  private async createLeadFinal(ctx: any, session: LeadSession, userId: number) {
    const platformUserId = ctx.from?.id.toString();

    const { 
      companyName, 
      sector, 
      transactionType, 
      clientPoc, 
      emailId, 
      phoneNumber, 
      sourceType, 
      inboundSource, 
      outboundSource,
      leadAssignment,
      coLeadAssignment
    } = session.data;

    // Show summary
    let summaryText = `📋 Creating lead...\n\n` +
      `Company: ${companyName}\n` +
      `Sector: ${sector}\n` +
      `Type: ${transactionType}\n` +
      `POC: ${clientPoc}\n` +
      `Email: ${emailId}\n` +
      `Phone: ${phoneNumber}\n` +
      `Source: ${sourceType} - ${inboundSource || outboundSource}`;

    if (leadAssignment) {
      summaryText += `\n👥 Lead: ${leadAssignment}`;
    }
    if (coLeadAssignment) {
      summaryText += `\n👥 Co-Lead: ${coLeadAssignment}`;
    }

    await ctx.reply(summaryText);

    try {
      const response = await fetch(`${this.config.apiUrl}/api/bot/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Key": this.config.botSecretKey,
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
          outboundSource,
          leadAssignment,
          coLeadAssignment,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const sectorDisplay = data.lead.customSector || data.lead.sector;
        const transactionDisplay = data.lead.customTransactionType || data.lead.transactionType;
        const sourceDisplay = data.lead.customInboundSource || 
                              data.lead.inboundSource || 
                              data.lead.outboundSource;

        let successMessage = `✅ Lead Added Successfully!\n\n` +
          `📋 ${data.lead.companyName}\n` +
          `🏭 ${sectorDisplay} - ${transactionDisplay}\n` +
          `👤 ${data.lead.clientPoc}\n` +
          `📧 ${data.lead.emailId}\n` +
          `📱 ${data.lead.phoneNumber}\n` +
          `📥 ${data.lead.sourceType}: ${sourceDisplay}\n`;

        if (data.lead.leadAssignment) {
          successMessage += `👥 Lead: ${data.lead.leadAssignment}\n`;
        }
        if (data.lead.coLeadAssignment) {
          successMessage += `👥 Co-Lead: ${data.lead.coLeadAssignment}\n`;
        }

        successMessage += `\nStatus: ${data.lead.status}\n\n` +
          `Use /newlead to add another lead.`;

        await ctx.reply(successMessage);
      } else {
        await ctx.reply(`❌ Failed to add lead: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating lead via bot:", error);
      await ctx.reply("❌ Failed to add lead. Please try again with /newlead");
    }
  }

  // Keep old method for backward compatibility
  private async confirmAndCreateLead(ctx: any, session: LeadSession, userId: number) {
    await this.createLeadFinal(ctx, session, userId);
  }

  // ============================================
  // Edit Lead Methods
  // ============================================

  private async showLeadsToEdit(ctx: any, platformUserId: string) {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/user-leads/telegram/${platformUserId}`,
        { headers: { "X-Bot-Key": this.config.botSecretKey } }
      );

      const data = await response.json();

      if (!data.success || !data.leads || data.leads.length === 0) {
        await ctx.reply("📋 You don't have any leads to edit.");
        return;
      }

      const keyboard = new InlineKeyboard();
      data.leads.slice(0, 10).forEach((lead: any, index: number) => {
        const sector = lead.customSector || lead.sector;
        const tx = lead.customTransactionType || lead.transactionType;
        keyboard.text(`${lead.companyName} (${sector})`, `editlead_${lead.id}`);
        if (index % 2 === 1) keyboard.row();
      });

      await ctx.reply("Select a lead to edit:", { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply("❌ Failed to fetch leads.");
    }
  }

  private async askWhatToEdit(ctx: any) {
    const keyboard = new InlineKeyboard()
      .text("Status", "editfield_status")
      .text("Acceptance Stage", "editfield_acceptance").row()
      .text("Lead", "editfield_lead")
      .text("Co-Lead", "editfield_colead");

    await ctx.reply("What would you like to edit?", { reply_markup: keyboard });
  }

  private async askNewValue(ctx: any, field: string) {
    let keyboard = new InlineKeyboard();

    switch (field) {
      case "status":
        keyboard
          .text("Initial Discussion", "status_Initial Discussion")
          .text("NDA", "status_NDA").row()
          .text("Engagement", "status_Engagement");
        await ctx.reply("Select new status:", { reply_markup: keyboard });
        break;

      case "acceptance":
        keyboard
          .text("Undecided", "acceptance_Undecided")
          .text("Accepted", "acceptance_Accepted").row()
          .text("Rejected", "acceptance_Rejected");
        await ctx.reply("Select acceptance stage:", { reply_markup: keyboard });
        break;

      case "lead":
        keyboard
          .text("Pankaj Karna", "newlead_Pankaj Karna")
          .text("Nitin Gupta", "newlead_Nitin Gupta").row()
          .text("Aakash Jain", "newlead_Aakash Jain")
          .text("Ojasva Chugh", "newlead_Ojasva Chugh").row()
          .text("Ujjwal Jha", "newlead_Ujjwal Jha")
          .text("Devapi Singh", "newlead_Devapi Singh");
        await ctx.reply("Select new lead:", { reply_markup: keyboard });
        break;

      case "colead":
        keyboard
          .text("Pankaj Karna", "newcolead_Pankaj Karna")
          .text("Nitin Gupta", "newcolead_Nitin Gupta").row()
          .text("Aakash Jain", "newcolead_Aakash Jain")
          .text("Ojasva Chugh", "newcolead_Ojasva Chugh").row()
          .text("Ujjwal Jha", "newcolead_Ujjwal Jha")
          .text("Devapi Singh", "newcolead_Devapi Singh").row()
          .text("Remove Co-Lead", "newcolead_");
        await ctx.reply("Select new co-lead:", { reply_markup: keyboard });
        break;
    }
  }

  private async updateLeadField(ctx: any, session: LeadSession, userId: number) {
    const { leadId, editField, newStatus, newAcceptance, newLead, newCoLead } = session.data;

    let updateData: any = {};
    let fieldName = "";

    switch (editField) {
      case "status":
        updateData.status = newStatus;
        fieldName = "Status";
        break;
      case "acceptance":
        updateData.acceptanceStage = newAcceptance;
        fieldName = "Acceptance Stage";
        break;
      case "lead":
        updateData.leadAssignment = newLead;
        fieldName = "Lead";
        break;
      case "colead":
        updateData.coLeadAssignment = newCoLead || null;
        fieldName = "Co-Lead";
        break;
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/leads/${leadId}/update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Bot-Key": this.config.botSecretKey,
          },
          body: JSON.stringify({
            platformUserId: ctx.from?.id.toString(),
            platform: "telegram",
            ...updateData,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await ctx.reply(`✅ ${fieldName} updated successfully!`);
      } else {
        await ctx.reply(`❌ Failed to update ${fieldName}: ${data.message}`);
      }
    } catch (error) {
      await ctx.reply(`❌ Failed to update ${fieldName}. Please try again.`);
    }
  }

  // ============================================
  // Convert to Client Methods
  // ============================================

  private async showLeadsToConvert(ctx: any, platformUserId: string) {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/user-leads/telegram/${platformUserId}`,
        { headers: { "X-Bot-Key": this.config.botSecretKey } }
      );

      const data = await response.json();

      if (!data.success || !data.leads || data.leads.length === 0) {
        await ctx.reply("📋 You don't have any leads to convert.");
        return;
      }

      const keyboard = new InlineKeyboard();
      data.leads.slice(0, 10).forEach((lead: any, index: number) => {
        const sector = lead.customSector || lead.sector;
        const tx = lead.customTransactionType || lead.transactionType;
        keyboard.text(
          `${lead.companyName} (${sector} - ${tx})`,
          `convertlead_${lead.id}`
        );
        if (index % 1 === 0) keyboard.row();
      });

      await ctx.reply("Select a lead to convert to client:", { reply_markup: keyboard });
    } catch (error) {
      await ctx.reply("❌ Failed to fetch leads.");
    }
  }

  private async confirmConversion(ctx: any, session: LeadSession) {
    const keyboard = new InlineKeyboard()
      .text("Yes, Convert", "convert_yes")
      .text("Cancel", "convert_no");

    await ctx.reply(
      "⚠️ Are you sure you want to convert this lead to a client?",
      { reply_markup: keyboard }
    );
  }

  private async confirmDeletion(ctx: any, session: LeadSession) {
    const keyboard = new InlineKeyboard()
      .text("Yes, DELETE", "delete_yes")
      .text("Cancel", "delete_no");

    await ctx.reply(
      "⚠️ Are you sure you want to PERMANENTLY DELETE this lead? This action cannot be undone.",
      { reply_markup: keyboard }
    );
  }

  private async convertLeadToClient(ctx: any, session: LeadSession, userId: number) {
    const { leadId } = session.data;
    const platformUserId = ctx.from?.id.toString();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/leads/${leadId}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bot-Key": this.config.botSecretKey,
          },
          body: JSON.stringify({
            platformUserId,
            platform: "telegram",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await ctx.reply(
          `✅ Lead converted to client successfully!\n\n` +
          `📋 ${data.client.companyName}\n` +
          `View in Clients section.`
        );
      } else {
        await ctx.reply(`❌ Failed to convert lead: ${data.message}`);
      }
    } catch (error) {
      await ctx.reply("❌ Failed to convert lead. Please try again.");
    }
  }

  private async deleteLead(ctx: any, session: LeadSession, userId: number) {
    const { leadId } = session.data;
    const platformUserId = ctx.from?.id.toString();

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/bot/leads/${leadId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Bot-Key": this.config.botSecretKey,
          },
          body: JSON.stringify({
            platformUserId,
            platform: "telegram",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await ctx.reply("✅ Lead deleted successfully!");
      } else {
        await ctx.reply(`❌ Failed to delete lead: ${data.message}`);
      }
    } catch (error) {
      await ctx.reply("❌ Failed to delete lead. Please try again.");
    }
  }

  // ============================================
    // Clients List & View
    // ============================================

    private async showClientsList(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.clients || data.clients.length === 0) {
          await ctx.reply("📋 You don't have any clients yet.");
          return;
        }
        const lines = data.clients.slice(0, 15).map((c: any, i: number) => {
          const sector = c.customSector || c.sector || "—";
          return `${i + 1}. *${c.companyName}* — ${sector}`;
        }).join("\n");
        await ctx.reply(`🤝 Your Clients (${data.clients.length}):\n\n${lines}`, { parse_mode: "Markdown" });
      } catch { await ctx.reply("❌ Failed to fetch clients."); }
    }

    private async showLeadsToView(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-leads/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.leads || data.leads.length === 0) {
          await ctx.reply("📋 You don't have any leads."); return;
        }
        const keyboard = new InlineKeyboard();
        data.leads.slice(0, 10).forEach((lead: any, i: number) => {
          keyboard.text(`${lead.companyName}`, `viewlead_${lead.id}`);
          if (i % 2 === 1) keyboard.row();
        });
        await ctx.reply("Select a lead to view:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch leads."); }
    }

    private async showLeadDetail(ctx: any, leadId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-leads/telegram/${ctx.from?.id}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        const lead = data.leads?.find((l: any) => l.id === leadId);
        if (!lead) { await ctx.reply("❌ Lead not found."); return; }
        const sector = lead.customSector || lead.sector;
        const tx = lead.customTransactionType || lead.transactionType;
        const source = lead.customInboundSource || lead.inboundSource || lead.outboundSource || "—";
        await ctx.reply(
          `📋 *${lead.companyName}*\n\n` +
          `🏭 Sector: ${sector}\n` +
          `💼 Type: ${tx}\n` +
          `👤 POC: ${lead.clientPoc}\n` +
          `📧 Email: ${lead.emailId}\n` +
          `📱 Phone: ${lead.phoneNumber}\n` +
          `📥 Source: ${lead.sourceType} — ${source}\n` +
          `📊 Status: ${lead.status}\n` +
          `✅ Acceptance: ${lead.acceptanceStage}\n` +
          `👥 Lead: ${lead.leadAssignment || "—"}\n` +
          `👥 Co-Lead: ${lead.coLeadAssignment || "—"}`,
          { parse_mode: "Markdown" }
        );
      } catch { await ctx.reply("❌ Failed to fetch lead details."); }
    }

    private async showClientsToView(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.clients || data.clients.length === 0) {
          await ctx.reply("📋 You don't have any clients."); return;
        }
        const keyboard = new InlineKeyboard();
        data.clients.slice(0, 10).forEach((c: any, i: number) => {
          keyboard.text(`${c.companyName}`, `viewclient_${c.id}`);
          if (i % 2 === 1) keyboard.row();
        });
        await ctx.reply("Select a client to view:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch clients."); }
    }

    private async showClientDetail(ctx: any, clientId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${ctx.from?.id}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        const client = data.clients?.find((c: any) => c.id === clientId);
        if (!client) { await ctx.reply("❌ Client not found."); return; }
        const sector = client.customSector || client.sector || "—";
        const tx = client.customTransactionType || client.transactionType || "—";
        await ctx.reply(
          `🤝 *${client.companyName}*\n\n` +
          `🏭 Sector: ${sector}\n` +
          `💼 Type: ${tx}\n` +
          `👤 POC: ${client.clientPoc || "—"}\n` +
          `📧 Email: ${client.emailId || "—"}\n` +
          `📱 Phone: ${client.phoneNumber || "—"}\n` +
          `👥 Lead: ${client.leadAssignment || "—"}\n` +
          `👥 Co-Lead: ${client.coLeadAssignment || "—"}`,
          { parse_mode: "Markdown" }
        );
      } catch { await ctx.reply("❌ Failed to fetch client details."); }
    }

    // ============================================
    // Edit Client
    // ============================================

    private async showClientsToEdit(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.clients || data.clients.length === 0) {
          await ctx.reply("📋 You don't have any clients to edit."); return;
        }
        const keyboard = new InlineKeyboard();
        data.clients.slice(0, 10).forEach((c: any, i: number) => {
          keyboard.text(`${c.companyName}`, `editclient_${c.id}`);
          if (i % 2 === 1) keyboard.row();
        });
        await ctx.reply("Select a client to edit:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch clients."); }
    }

    private async askWhatToEditClient(ctx: any) {
      const keyboard = new InlineKeyboard()
        .text("Lead", "editclientfield_lead")
        .text("Co-Lead", "editclientfield_colead");
      await ctx.reply("What would you like to edit?", { reply_markup: keyboard });
    }

    private async askNewClientValue(ctx: any, field: string) {
      const keyboard = new InlineKeyboard();
      if (field === "lead") {
        keyboard.text("Pankaj Karna", "clead_Pankaj Karna").text("Nitin Gupta", "clead_Nitin Gupta").row()
          .text("Aakash Jain", "clead_Aakash Jain").text("Ojasva Chugh", "clead_Ojasva Chugh").row()
          .text("Ujjwal Jha", "clead_Ujjwal Jha").text("Devapi Singh", "clead_Devapi Singh");
        await ctx.reply("Select new lead:", { reply_markup: keyboard });
      } else if (field === "colead") {
        keyboard.text("Pankaj Karna", "ccolead_Pankaj Karna").text("Nitin Gupta", "ccolead_Nitin Gupta").row()
          .text("Aakash Jain", "ccolead_Aakash Jain").text("Ojasva Chugh", "ccolead_Ojasva Chugh").row()
          .text("Ujjwal Jha", "ccolead_Ujjwal Jha").text("Devapi Singh", "ccolead_Devapi Singh").row()
          .text("Remove Co-Lead", "ccolead_");
        await ctx.reply("Select new co-lead:", { reply_markup: keyboard });
      }
    }

    private async updateClientField(ctx: any, session: LeadSession, userId: number) {
      const { clientId, editField, newLead, newCoLead } = session.data;
      let updateData: any = {};
      let fieldName = "";
      if (editField === "lead") { updateData.leadAssignment = newLead; fieldName = "Lead"; }
      else if (editField === "colead") { updateData.coLeadAssignment = newCoLead || null; fieldName = "Co-Lead"; }
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/clients/${clientId}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Bot-Key": this.config.botSecretKey },
          body: JSON.stringify({ platformUserId: ctx.from?.id.toString(), platform: "telegram", ...updateData }),
        });
        const data = await response.json();
        if (data.success) await ctx.reply(`✅ ${fieldName} updated successfully!`);
        else await ctx.reply(`❌ Failed to update ${fieldName}: ${data.message}`);
      } catch { await ctx.reply(`❌ Failed to update ${fieldName}.`); }
    }

    // ============================================
    // Add Note
    // ============================================

    private async showLeadsToAddNote(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-leads/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.leads || data.leads.length === 0) {
          await ctx.reply("📋 No leads found."); return;
        }
        const keyboard = new InlineKeyboard();
        data.leads.slice(0, 10).forEach((l: any, i: number) => {
          keyboard.text(l.companyName, `notelead_${l.id}`);
          if (i % 2 === 1) keyboard.row();
        });
        await ctx.reply("Select a lead to add a note to:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch leads."); }
    }

    private async showClientsToAddNote(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.clients || data.clients.length === 0) {
          await ctx.reply("📋 No clients found."); return;
        }
        const keyboard = new InlineKeyboard();
        data.clients.slice(0, 10).forEach((c: any, i: number) => {
          keyboard.text(c.companyName, `noteclient_${c.id}`);
          if (i % 2 === 1) keyboard.row();
        });
        await ctx.reply("Select a client to add a note to:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch clients."); }
    }

    private async submitNote(ctx: any, session: LeadSession, userId: number) {
      const { noteType, recordId, noteText } = session.data;
      const platformUserId = ctx.from?.id.toString();
      const url = noteType === "lead"
        ? `${this.config.apiUrl}/api/bot/leads/${recordId}/notes`
        : `${this.config.apiUrl}/api/bot/clients/${recordId}/notes`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Bot-Key": this.config.botSecretKey },
          body: JSON.stringify({ platformUserId, platform: "telegram", note: noteText }),
        });
        const data = await response.json();
        if (data.success) await ctx.reply("✅ Note added successfully!");
        else await ctx.reply(`❌ Failed to add note: ${data.message}`);
      } catch { await ctx.reply("❌ Failed to add note."); }
    }

    // ============================================
    // Delete Client
    // ============================================

    private async showClientsToDelete(ctx: any, platformUserId: string) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
          { headers: { "X-Bot-Key": this.config.botSecretKey } });
        const data = await response.json();
        if (!data.success || !data.clients || data.clients.length === 0) {
          await ctx.reply("📋 No clients to delete."); return;
        }
        const keyboard = new InlineKeyboard();
        data.clients.slice(0, 10).forEach((c: any, i: number) => {
          keyboard.text(c.companyName, `deleteclient_${c.id}`);
          if (i % 1 === 0) keyboard.row();
        });
        await ctx.reply("Select a client to delete:", { reply_markup: keyboard });
      } catch { await ctx.reply("❌ Failed to fetch clients."); }
    }

    private async confirmClientDeletion(ctx: any, session: LeadSession) {
      const keyboard = new InlineKeyboard()
        .text("Yes, Delete", "deleteclient_yes")
        .text("Cancel", "deleteclient_no");
      await ctx.reply("⚠️ Are you sure you want to delete this client? This cannot be undone.", { reply_markup: keyboard });
    }

    private async deleteClient(ctx: any, session: LeadSession, userId: number) {
      const { clientId } = session.data;
      const platformUserId = ctx.from?.id.toString();
      try {
        const response = await fetch(`${this.config.apiUrl}/api/bot/clients/${clientId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "X-Bot-Key": this.config.botSecretKey },
          body: JSON.stringify({ platformUserId, platform: "telegram" }),
        });
        const data = await response.json();
        if (data.success) await ctx.reply("✅ Client deleted successfully.");
        else await ctx.reply(`❌ Failed to delete: ${data.message}`);
      } catch { await ctx.reply("❌ Failed to delete client."); }
    }

    // ============================================
    // Helper Functions
    // ============================================

    private async checkUserLinked(platformUserId: string): Promise<boolean> {
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
// ============================================
// Reminder Methods
// ============================================

private parseReminderDate(input: string): Date | null {
  try {
    // Handles: "25 Jan 2026 10:00 AM", "3 Feb 2026 02:30 PM"
    const months: Record<string, number> = {
      jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
      jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
    };
    const match = input.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    const [, day, mon, year, hour, min, ampm] = match;
    const monthIndex = months[mon.toLowerCase()];
    if (monthIndex === undefined) return null;
    let h = parseInt(hour);
    if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  // Convert IST to UTC by subtracting 5h30m
    const dateIST = new Date(parseInt(year), monthIndex, parseInt(day), h, parseInt(min));
    if (isNaN(dateIST.getTime()) || dateIST <= new Date()) return null;
    const dateUTC = new Date(dateIST.getTime() - (5.5 * 60 * 60 * 1000));
    return dateUTC;
  } catch { return null; }
}

private async createReminder(ctx: any, session: LeadSession, userId: number) {
  const platformUserId = ctx.from?.id.toString();
  const { linkedType, linkedId, reminderMessage, reminderAt } = session.data;
  try {
    const response = await fetch(`${this.config.apiUrl}/api/bot/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Key": this.config.botSecretKey },
      body: JSON.stringify({
        platform: "telegram",
        platformUserId,
        message: reminderMessage,
        reminderAt,
        linkedType: linkedType === "none" ? null : linkedType,
        linkedId: linkedId || null,
      }),
    });
    const data = await response.json();
    if (data.success) {
      const date = new Date(reminderAt);
      const istDate = new Date(new Date(reminderAt).getTime() + (5.5 * 60 * 60 * 1000));
      const formatted = istDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      await ctx.reply(`✅ Reminder set for *${formatted}*\n\n📝 "${reminderMessage}"`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`❌ Failed to set reminder: ${data.message}`);
    }
  } catch { await ctx.reply("❌ Failed to set reminder. Please try again."); }
}

private async showMyReminders(ctx: any, platformUserId: string) {
  try {
    const response = await fetch(`${this.config.apiUrl}/api/bot/reminders/telegram/${platformUserId}`,
      { headers: { "X-Bot-Key": this.config.botSecretKey } });
    const data = await response.json();
    if (!data.success || !data.reminders || data.reminders.length === 0) {
      await ctx.reply("🔔 You have no pending reminders."); return;
    }
    for (const r of data.reminders) {
      const istDate = new Date(new Date(r.reminderAt).getTime() + (5.5 * 60 * 60 * 1000));
      const formatted = istDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      const keyboard = new InlineKeyboard().text("❌ Cancel", `cancelreminder_${r.id}`);
      await ctx.reply(
        `🔔 *${formatted}*\n📝 ${r.message}${r.linkedType ? `\n🔗 Linked to ${r.linkedType}` : ""}`,
        { parse_mode: "Markdown", reply_markup: keyboard }
      );
    }
  } catch { await ctx.reply("❌ Failed to fetch reminders."); }
}

private async showLeadsToRemind(ctx: any, platformUserId: string) {
  try {
    const response = await fetch(`${this.config.apiUrl}/api/bot/user-leads/telegram/${platformUserId}`,
      { headers: { "X-Bot-Key": this.config.botSecretKey } });
    const data = await response.json();
    if (!data.success || !data.leads || data.leads.length === 0) {
      await ctx.reply("📋 No leads found."); return;
    }
    const keyboard = new InlineKeyboard();
    data.leads.slice(0, 10).forEach((l: any, i: number) => {
      keyboard.text(l.companyName, `remindlead_${l.id}`);
      if (i % 2 === 1) keyboard.row();
    });
    await ctx.reply("Select a lead to link this reminder to:", { reply_markup: keyboard });
  } catch { await ctx.reply("❌ Failed to fetch leads."); }
}

private async showClientsToRemind(ctx: any, platformUserId: string) {
  try {
    const response = await fetch(`${this.config.apiUrl}/api/bot/user-clients/telegram/${platformUserId}`,
      { headers: { "X-Bot-Key": this.config.botSecretKey } });
    const data = await response.json();
    if (!data.success || !data.clients || data.clients.length === 0) {
      await ctx.reply("📋 No clients found."); return;
    }
    const keyboard = new InlineKeyboard();
    data.clients.slice(0, 10).forEach((c: any, i: number) => {
      keyboard.text(c.companyName, `remindclient_${c.id}`);
      if (i % 2 === 1) keyboard.row();
    });
    await ctx.reply("Select a client to link this reminder to:", { reply_markup: keyboard });
  } catch { await ctx.reply("❌ Failed to fetch clients."); }
}

private async checkAndSendReminders() {
  try {
    const response = await fetch(`${this.config.apiUrl}/api/bot/reminders/due`,
      { headers: { "X-Bot-Key": this.config.botSecretKey } });
    const data = await response.json();
    if (!data.success || !data.reminders) return;
    for (const reminder of data.reminders) {
      try {
        await this.bot.api.sendMessage(
          reminder.telegramUserId,
          `🔔 *Reminder!*\n\n📝 ${reminder.message}${reminder.linkedType ? `\n🔗 Linked to ${reminder.linkedType}` : ""}`,
          { parse_mode: "Markdown" }
        );
        await fetch(`${this.config.apiUrl}/api/bot/reminders/${reminder.id}`, {
          method: "DELETE",
          headers: { "X-Bot-Key": this.config.botSecretKey },
        });
      } catch (err) {
        console.error(`Failed to send reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Reminder scheduler error:", err);
  }
}
async start() {
  console.log("🤖 Starting Telegram bot...");

  this.bot.start().catch((error) => {
    console.error("❌ Telegram bot error:", error);
  });

  // Start reminder scheduler — checks every 60 seconds
  this.reminderInterval = setInterval(() => {
    this.checkAndSendReminders();
  }, 60 * 1000);

  console.log("✅ Telegram bot started (connecting...)");
}

async stop() {
  console.log("🛑 Stopping Telegram bot...");
  if (this.reminderInterval) clearInterval(this.reminderInterval);
  await this.bot.stop();
  console.log("✅ Telegram bot stopped.");
}
}