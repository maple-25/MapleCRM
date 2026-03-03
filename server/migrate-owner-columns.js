import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function addOwnerColumns() {
  console.log('Adding owner_id columns to leads and clients tables...');
  
  try {
    // Check if columns already exist before adding them
    const leadsColumnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'owner_id';
    `;
    
    if (leadsColumnCheck.length === 0) {
      await sql`ALTER TABLE leads ADD COLUMN owner_id VARCHAR REFERENCES users(id);`;
      console.log('Added owner_id column to leads table');
    } else {
      console.log('owner_id column already exists in leads table');
    }

    const clientsColumnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'owner_id';
    `;
    
    if (clientsColumnCheck.length === 0) {
      await sql`ALTER TABLE clients ADD COLUMN owner_id VARCHAR REFERENCES users(id);`;
      console.log('Added owner_id column to clients table');
    } else {
      console.log('owner_id column already exists in clients table');
    }

    // Set default owner for existing records (use first admin user)
    const adminUser = await sql`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1;
    `;
    
    if (adminUser.length > 0) {
      const adminId = adminUser[0].id;
      
      await sql`UPDATE leads SET owner_id = ${adminId} WHERE owner_id IS NULL;`;
      await sql`UPDATE clients SET owner_id = ${adminId} WHERE owner_id IS NULL;`;
      
      console.log('Set default owner for existing records');
    }

    // Make columns NOT NULL after setting default values
    await sql`ALTER TABLE leads ALTER COLUMN owner_id SET NOT NULL;`;
    await sql`ALTER TABLE clients ALTER COLUMN owner_id SET NOT NULL;`;
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

addOwnerColumns();