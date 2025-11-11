-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."acceptance_stage" AS ENUM('Undecided', 'Accepted', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."assigned_to" AS ENUM('Pankaj Karna', 'Nitin Gupta', 'Abhinav Grover', 'Manish Johari', 'Aakash Jain', 'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('NDA Shared', 'NDA Signed', 'IM/Financial Model', 'Investor Tracker', 'Term Sheet', 'Due Diligence', 'Agreement', 'Transaction closed');--> statement-breakpoint
CREATE TYPE "public"."comment_type" AS ENUM('update', 'change', 'feedback');--> statement-breakpoint
CREATE TYPE "public"."inbound_source" AS ENUM('Kotak Wealth', '360 Wealth', 'LGT', 'Pandion Partners', 'Others');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('Initial Discussion', 'NDA', 'Engagement');--> statement-breakpoint
CREATE TYPE "public"."project_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sector" AS ENUM('Technology', 'Manufacturing', 'Healthcare', 'Energy', 'Real Estate', 'Consumer Goods', 'Others');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('Inbound', 'Outbound');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('M&A', 'Fundraising', 'Debt Financing', 'Strategic Advisory', 'Others');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"commission_rate" numeric(5, 2) DEFAULT '0.00',
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"sector" "sector" NOT NULL,
	"custom_sector" text,
	"transaction_type" "transaction_type" NOT NULL,
	"custom_transaction_type" text,
	"client_poc" text NOT NULL,
	"phone_number" text,
	"email_id" text NOT NULL,
	"last_contacted" timestamp with time zone,
	"status" "client_status" DEFAULT 'NDA Shared' NOT NULL,
	"assigned_to" "assigned_to" NOT NULL,
	"converted_from_lead_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"sector" "sector" NOT NULL,
	"custom_sector" text,
	"transaction_type" "transaction_type" NOT NULL,
	"custom_transaction_type" text,
	"client_poc" text NOT NULL,
	"phone_number" text,
	"email_id" text NOT NULL,
	"first_contacted" timestamp with time zone,
	"last_contacted" timestamp with time zone,
	"source_type" "source_type" NOT NULL,
	"inbound_source" "inbound_source",
	"custom_inbound_source" text,
	"outbound_source" text,
	"acceptance_stage" "acceptance_stage" DEFAULT 'Undecided' NOT NULL,
	"status" "lead_status" DEFAULT 'Initial Discussion' NOT NULL,
	"assigned_to" "assigned_to" NOT NULL,
	"is_converted" text DEFAULT 'false',
	"converted_client_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority" "project_priority" DEFAULT 'medium' NOT NULL,
	"status" "project_status" DEFAULT 'planning' NOT NULL,
	"start_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"client_id" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_username_key" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"comment_type" "comment_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"can_edit" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "project_members_project_id_user_id_key" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_client_id_fkey" FOREIGN KEY ("converted_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
*/