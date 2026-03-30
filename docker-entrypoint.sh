#!/bin/sh
set -e

echo "Waiting for database..."
for i in $(seq 1 30); do
  if node -e "const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT 1').then(()=>{p.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "Database is ready."
    break
  fi
  if [ "$i" = "30" ]; then
    echo "Database connection timeout after 30 attempts."
    exit 1
  fi
  echo "Attempt $i: waiting for database..."
  sleep 2
done

echo "Pushing database schema..."
npx drizzle-kit push --force 2>/dev/null || echo "drizzle-kit push skipped (non-interactive), using manual migrations."
echo "Schema step done."

echo "Ensuring all tables exist..."
node -e "
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
p.query(\`
  CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
  );
  CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

  CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS invite_status VARCHAR(10) NOT NULL DEFAULT 'none';
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS invited_by VARCHAR(100);
\`).then(()=>{console.log('Tables ready.');p.end()}).catch(e=>{console.error('Migration error:',e);p.end();process.exit(1)});
"

echo "Seeding agent accounts..."
node -e "
const{Pool}=require('pg');
const bcrypt=require('bcryptjs');
const p=new Pool({connectionString:process.env.DATABASE_URL});
const agents=[
  {name:'Sera',username:'sera',password:process.env.SERA_PASSWORD||'sera123'},
  {name:'Deven',username:'deven',password:process.env.DEVEN_PASSWORD||'deven123'},
  {name:'Anna',username:'anna',password:process.env.ANNA_PASSWORD||'anna123'},
];
(async()=>{
  for(const a of agents){
    const hash=await bcrypt.hash(a.password,10);
    await p.query('INSERT INTO agents(name,username,password,created_at) VALUES(\$1,\$2,\$3,NOW()) ON CONFLICT(username) DO NOTHING',[a.name,a.username,hash]);
  }
  console.log('Agent accounts ready.');
  p.end();
})().catch(e=>{console.error('Seed error:',e);p.end()});
"

echo "Starting application..."
exec node dist/index.cjs
