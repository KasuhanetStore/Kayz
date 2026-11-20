export async function ensureAILearningTables(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS ai_knowledge (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL DEFAULT 'general', fact TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'admin_verified', created_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge(category,id DESC)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS ai_learning_events (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, page_path TEXT, outcome TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
export async function getApprovedAIKnowledge(db, limit=12) {
  await ensureAILearningTables(db);
  const rows = await db.prepare("SELECT id,category,fact FROM ai_knowledge WHERE source='admin_verified' ORDER BY id DESC LIMIT ?").bind(Math.max(1,Math.min(20,Number(limit)||12))).all();
  return (rows.results||[]).reverse();
}
export async function addApprovedAIKnowledge(db, fact, category='general', createdBy='telegram-admin') {
  const cleanFact=String(fact||'').trim().slice(0,1200);
  const cleanCategory=String(category||'general').trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,40)||'general';
  if(cleanFact.length<8) throw new Error('Pengetahuan terlalu pendek.');
  await ensureAILearningTables(db);
  const result=await db.prepare("INSERT INTO ai_knowledge(category,fact,source,created_by) VALUES(?,?,'admin_verified',?)").bind(cleanCategory,cleanFact,String(createdBy||'telegram-admin').slice(0,80)).run();
  return result.meta?.last_row_id||null;
}
export async function removeApprovedAIKnowledge(db,id) {
  await ensureAILearningTables(db);
  const result=await db.prepare("DELETE FROM ai_knowledge WHERE id=? AND source='admin_verified'").bind(Number(id)).run();
  return (result.meta?.changes||0)>0;
}
export async function recordAIExperience(db,channel,pagePath,outcome) {
  await ensureAILearningTables(db);
  const safePath=String(pagePath||'').replace(/[\r\n?#]/g,'').slice(0,180);
  await db.prepare('INSERT INTO ai_learning_events(channel,page_path,outcome) VALUES(?,?,?)').bind(String(channel||'unknown').slice(0,30),safePath,String(outcome||'unknown').slice(0,30)).run();
}