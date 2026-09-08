
import { db } from './db/index.js';
import { agents } from './db/schema.js';
async function check() {
  const all = await db.select().from(agents).limit(5);
  all.forEach(a => console.log(a.agentId, a.owner));
}
check();

