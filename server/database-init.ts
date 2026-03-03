import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

export async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Drop existing tables if they exist to recreate with new schema
    console.log('Dropping existing tables...');
    await sql`DROP TABLE IF EXISTS project_members CASCADE`;
    await sql`DROP TABLE IF EXISTS projects CASCADE`;
    await sql`DROP TABLE IF EXISTS clients CASCADE`;
    await sql`DROP TABLE IF EXISTS leads CASCADE`;
    await sql`DROP TABLE IF EXISTS partners CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    console.log('Tables dropped successfully');
    
    // Drop existing enums
    await sql`DROP TYPE IF EXISTS user_role CASCADE`;
    await sql`DROP TYPE IF EXISTS lead_status CASCADE`;
    await sql`DROP TYPE IF EXISTS client_status CASCADE`;
    await sql`DROP TYPE IF EXISTS project_status CASCADE`;
    await sql`DROP TYPE IF EXISTS sector CASCADE`;
    await sql`DROP TYPE IF EXISTS transaction_type CASCADE`;
    await sql`DROP TYPE IF EXISTS source_type CASCADE`;
    await sql`DROP TYPE IF EXISTS inbound_source CASCADE`;
    await sql`DROP TYPE IF EXISTS acceptance_stage CASCADE`;
    await sql`DROP TYPE IF EXISTS assigned_to CASCADE`;

    // Create enums
    await sql`CREATE TYPE user_role AS ENUM ('admin', 'user')`;
    await sql`CREATE TYPE lead_status AS ENUM ('Initial Discussion', 'NDA', 'Engagement')`;
    await sql`CREATE TYPE client_status AS ENUM ('NDA Shared', 'NDA Signed', 'IM/Financial Model', 'Investor Tracker', 'Term Sheet', 'Due Diligence', 'Agreement', 'Transaction closed')`;
    await sql`CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled')`;
    await sql`CREATE TYPE sector AS ENUM ('Technology', 'Manufacturing', 'Healthcare', 'Energy', 'Real Estate', 'Consumer Goods', 'Others')`;
    await sql`CREATE TYPE transaction_type AS ENUM ('M&A', 'Fundraising', 'Debt Financing', 'Strategic Advisory', 'Others')`;
    await sql`CREATE TYPE source_type AS ENUM ('Inbound', 'Outbound')`;
    await sql`CREATE TYPE inbound_source AS ENUM ('Kotak Wealth', '360 Wealth', 'LGT', 'Pandion Partners', 'Others')`;
    await sql`CREATE TYPE acceptance_stage AS ENUM ('Undecided', 'Accepted', 'Rejected')`;
    await sql`CREATE TYPE assigned_to AS ENUM ('Pankaj Karna', 'Nitin Gupta', 'Abhinav Grover', 'Manish Johari', 'Aakash Jain', 'Ojasva Chugh', 'Ujjwal Jha', 'Devapi Singh')`;
    
    // Create users table
    await sql`
      CREATE TABLE users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role user_role NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create partners table
    await sql`
      CREATE TABLE partners (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        website TEXT,
        commission_rate DECIMAL(5,2) DEFAULT 0.00,
        is_active TEXT NOT NULL DEFAULT 'true',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create clients table (must be before leads due to reference)
    await sql`
      CREATE TABLE clients (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        sector sector NOT NULL,
        custom_sector TEXT,
        transaction_type transaction_type NOT NULL,
        custom_transaction_type TEXT,
        client_poc TEXT NOT NULL,
        phone_number TEXT,
        email_id TEXT NOT NULL,
        last_contacted TIMESTAMP,
        status client_status NOT NULL DEFAULT 'NDA Shared',
        assigned_to assigned_to NOT NULL,
        converted_from_lead_id VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create leads table
    await sql`
      CREATE TABLE leads (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        sector sector NOT NULL,
        custom_sector TEXT,
        transaction_type transaction_type NOT NULL,
        custom_transaction_type TEXT,
        client_poc TEXT NOT NULL,
        phone_number TEXT,
        email_id TEXT NOT NULL,
        first_contacted TIMESTAMP,
        last_contacted TIMESTAMP,
        source_type source_type NOT NULL,
        inbound_source inbound_source,
        custom_inbound_source TEXT,
        outbound_source TEXT,
        acceptance_stage acceptance_stage NOT NULL DEFAULT 'Undecided',
        status lead_status NOT NULL DEFAULT 'Initial Discussion',
        assigned_to assigned_to NOT NULL,
        is_converted TEXT DEFAULT 'false',
        converted_client_id VARCHAR REFERENCES clients(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add foreign key constraint to clients table
    await sql`ALTER TABLE clients ADD CONSTRAINT fk_converted_from_lead FOREIGN KEY (converted_from_lead_id) REFERENCES leads(id)`;

    // Create projects table
    await sql`
      CREATE TABLE projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        client_id VARCHAR REFERENCES clients(id),
        owner_id VARCHAR NOT NULL REFERENCES users(id),
        status project_status NOT NULL DEFAULT 'planning',
        budget DECIMAL(10,2),
        progress INTEGER DEFAULT 0,
        start_date TIMESTAMP,
        due_date TIMESTAMP,
        completed_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create project members table
    await sql`
      CREATE TABLE project_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        can_edit TEXT NOT NULL DEFAULT 'false',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create project comments table
    await sql`
      CREATE TABLE project_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        comment_type TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Database tables created successfully - no demo data inserted

    console.log('Database initialized successfully!');
    return { success: true, message: 'Database initialized successfully!' };
  } catch (error: any) {
    // Check if tables already exist
    if (error.message.includes('already exists')) {
      console.log('Database tables already exist, skipping initialization');
      return { success: true, message: 'Database already initialized' };
    }
    console.error('Database initialization failed:', error);
    return { success: false, message: error.message };
  }
}