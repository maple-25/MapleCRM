import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function updateAssignedToField() {
  console.log('Updating assignedTo fields from enum to text...');
  
  try {
    // First, check if the columns are already text type
    const leadsColumnInfo = await sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'assigned_to';
    `;
    
    const clientsColumnInfo = await sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'assigned_to';
    `;
    
    console.log('Current leads assigned_to type:', leadsColumnInfo[0]?.data_type);
    console.log('Current clients assigned_to type:', clientsColumnInfo[0]?.data_type);
    
    if (leadsColumnInfo[0]?.data_type === 'USER-DEFINED') {
      console.log('Converting leads assigned_to from enum to text...');
      await sql`ALTER TABLE leads ALTER COLUMN assigned_to TYPE text;`;
      console.log('Successfully updated leads assigned_to column');
    } else {
      console.log('Leads assigned_to is already text type');
    }
    
    if (clientsColumnInfo[0]?.data_type === 'USER-DEFINED') {
      console.log('Converting clients assigned_to from enum to text...');
      await sql`ALTER TABLE clients ALTER COLUMN assigned_to TYPE text;`;
      console.log('Successfully updated clients assigned_to column');
    } else {
      console.log('Clients assigned_to is already text type');
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

updateAssignedToField();