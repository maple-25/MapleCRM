import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function createClientCommentsTable() {
  console.log('Creating client_comments table...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS client_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        comment_type comment_type NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('Successfully created client_comments table');
    
  } catch (error) {
    console.error('Failed to create table:', error);
  } finally {
    await sql.end();
  }
}

createClientCommentsTable();