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
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.bot = new Bot(config.botToken);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.command("start", async (ctx) => {
      await ctx.reply(
        "👋 Welcome to Maple Advisors CRM Bot!\n\n" +
        "Use /link to connect your account.\n" +
        "Use /newlead to add a lead.\n" +
        "Use /stats to view your stats.\n" +
        "Use /help to see all commands."
      );
    });

    // Handle /help command
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "📋 Available Commands:\n\n" +
        "/link - Link your Telegram to CRM\n" +
        "/newlead - Add a new lead\n" +
        "/stats - View your lead statistics\n" +
        "/cancel - Cancel current operation\n" +
        "/help - Show this message"
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

    // Handle callback queries (button clicks)
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
          sessions.set(userId, session);
          await this.confirmAndCreateLead(ctx, session, userId);
        }
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
        sessions.set(userId, session);
        await this.confirmAndCreateLead(ctx, session, userId);
        break;

      case "lead_inbound_source_custom":
        session.data.inboundSource = text.trim();
        sessions.set(userId, session);
        await this.confirmAndCreateLead(ctx, session, userId);
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

  private async confirmAndCreateLead(ctx: any, session: LeadSession, userId: number) {
    const platformUserId = ctx.from?.id.toString();
    sessions.delete(userId);

    const { companyName, sector, transactionType, clientPoc, emailId, phoneNumber, sourceType, inboundSource, outboundSource } = session.data;

    // Show summary before creating
    await ctx.reply(
      `📋 Creating lead...\n\n` +
      `Company: ${companyName}\n` +
      `Sector: ${sector}\n` +
      `Type: ${transactionType}\n` +
      `POC: ${clientPoc}\n` +
      `Email: ${emailId}\n` +
      `Phone: ${phoneNumber}\n` +
      `Source: ${sourceType} - ${inboundSource || outboundSource}`
    );

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
        }),
      });

      const data = await response.json();

      if (data.success) {
        const sectorDisplay = data.lead.customSector || data.lead.sector;
        const transactionDisplay = data.lead.customTransactionType || data.lead.transactionType;
        const sourceDisplay = data.lead.customInboundSource || 
                              data.lead.inboundSource || 
                              data.lead.outboundSource;

        await ctx.reply(
          `✅ Lead Added Successfully!\n\n` +
          `📋 ${data.lead.companyName}\n` +
          `🏭 ${sectorDisplay} - ${transactionDisplay}\n` +
          `👤 ${data.lead.clientPoc}\n` +
          `📧 ${data.lead.emailId}\n` +
          `📱 ${data.lead.phoneNumber}\n` +
          `📥 ${data.lead.sourceType}: ${sourceDisplay}\n\n` +
          `Status: ${data.lead.status}\n\n` +
          `Use /newlead to add another lead.`
        );
      } else {
        await ctx.reply(`❌ Failed to add lead: ${data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error creating lead via bot:", error);
      await ctx.reply("❌ Failed to add lead. Please try again with /newlead");
    }
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

  async start() {
    console.log("🤖 Starting Telegram bot...");

    this.bot.start().catch((error) => {
      console.error("❌ Telegram bot error:", error);
    });

    console.log("✅ Telegram bot started (connecting...)");
  }

  async stop() {
    console.log("🛑 Stopping Telegram bot...");
    await this.bot.stop();
    console.log("✅ Telegram bot stopped.");
  }
}