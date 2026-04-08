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

  ALTER TABLE agents ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'sales';
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS lead_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS lead_allocation_weight INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS lead_daily_quota INTEGER NOT NULL DEFAULT 50;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS lead_preferred_mode VARCHAR(20) NOT NULL DEFAULT 'button';
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

  CREATE TABLE IF NOT EXISTS lead_sources (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_invalid_reasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_import_batches (
    id SERIAL PRIMARY KEY,
    operator_agent_id INTEGER NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'tencent_doc',
    source_ref TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    total_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    strong_duplicate_blocked_count INTEGER NOT NULL DEFAULT 0,
    weak_duplicate_flagged_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW() NOT NULL,
    finished_at TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    import_batch_id INTEGER,
    source_platform_id INTEGER,
    source_activity VARCHAR(255),
    operator_agent_id INTEGER,
    phone VARCHAR(20),
    wechat_id VARCHAR(100),
    wechat_name VARCHAR(100),
    wechat_avatar_url TEXT,
    enterprise_wechat_link TEXT,
    qr_code_image_url TEXT,
    customer_screenshot_url TEXT,
    assigned_sales_agent_id INTEGER,
    assigned_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_assignment',
    is_valid BOOLEAN,
    invalid_reason_id INTEGER,
    invalid_note TEXT,
    is_suspected_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_score INTEGER,
    duplicate_review_status VARCHAR(50) NOT NULL DEFAULT 'not_needed',
    duplicate_reviewed_by INTEGER,
    duplicate_reviewed_at TIMESTAMP,
    duplicate_review_note TEXT,
    sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_assignments (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    sales_agent_id INTEGER NOT NULL,
    rule_type VARCHAR(50) NOT NULL DEFAULT 'weighted_random',
    rule_snapshot JSONB,
    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_actions (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    sales_agent_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_value VARCHAR(100),
    meta_json JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_duplicate_reviews (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    review_result VARCHAR(20) NOT NULL,
    suspected_target_lead_id INTEGER,
    reviewed_by INTEGER NOT NULL,
    review_note TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
  CREATE INDEX IF NOT EXISTS idx_leads_enterprise_wechat_link ON leads(enterprise_wechat_link);
  CREATE INDEX IF NOT EXISTS idx_leads_sales_status ON leads(assigned_sales_agent_id, status);
  CREATE INDEX IF NOT EXISTS idx_leads_source_created ON leads(source_platform_id, created_at);

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
  {name:'Sera',username:'sera',password:process.env.SERA_PASSWORD||'sera123',role:'admin',weight:1,quota:200},
  {name:'Deven',username:'deven',password:process.env.DEVEN_PASSWORD||'deven123',role:'sales',weight:1,quota:50},
  {name:'Anna',username:'anna',password:process.env.ANNA_PASSWORD||'anna123',role:'sales',weight:1,quota:50},
];
(async()=>{
  const sources=[
    ['zhihu','知乎',1],
    ['xiaohongshu','小红书',2],
    ['bilibili','B站',3],
    ['douyin','抖音',4],
    ['other','其他',99],
  ];
  const invalidReasons=[
    ['not_found','搜不到',1],
    ['added_by_other_sales','已被其他销售添加',2],
    ['existing_student_or_duplicate','已是学员/重复添加',3],
    ['account_abnormal','账号异常',4],
    ['rejected','拒绝添加',5],
    ['invalid_info','信息错误',6],
    ['no_response','无回应',7],
    ['other','其他',99],
  ];
  for(const a of agents){
    const hash=await bcrypt.hash(a.password,10);
    await p.query(
      'INSERT INTO agents(name,username,password,role,lead_enabled,lead_allocation_weight,lead_daily_quota,lead_preferred_mode,created_at,updated_at) VALUES(\$1,\$2,\$3,\$4,TRUE,\$5,\$6,\'button\',NOW(),NOW()) ON CONFLICT(username) DO UPDATE SET role=EXCLUDED.role, lead_enabled=EXCLUDED.lead_enabled, lead_allocation_weight=EXCLUDED.lead_allocation_weight, lead_daily_quota=EXCLUDED.lead_daily_quota, lead_preferred_mode=EXCLUDED.lead_preferred_mode, updated_at=NOW()',
      [a.name,a.username,hash,a.role,a.weight,a.quota]
    );
  }
  for(const [code,name,sortOrder] of sources){
    await p.query(
      'INSERT INTO lead_sources(code,name,sort_order,is_active,created_at) VALUES(\$1,\$2,\$3,TRUE,NOW()) ON CONFLICT(code) DO NOTHING',
      [code,name,sortOrder]
    );
  }
  for(const [code,name,sortOrder] of invalidReasons){
    await p.query(
      'INSERT INTO lead_invalid_reasons(code,name,sort_order,is_active,created_at) VALUES(\$1,\$2,\$3,TRUE,NOW()) ON CONFLICT(code) DO NOTHING',
      [code,name,sortOrder]
    );
  }
  console.log('Agent accounts ready.');
  p.end();
})().catch(e=>{console.error('Seed error:',e);p.end()});
"

echo "Starting application..."
exec node dist/index.cjs
