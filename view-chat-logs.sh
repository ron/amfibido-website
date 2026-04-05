#!/bin/bash

cd "$(dirname "$0")/workers/chat"

# Fetch all conversations with their messages
npx wrangler d1 execute chat-logs --remote --json --command "
  SELECT 
    c.id as conversation_id,
    c.created_at as started,
    c.origin,
    c.client_ip,
    m.role,
    m.content,
    m.created_at as sent_at
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  ORDER BY c.created_at DESC, m.created_at ASC
" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const rows = data[0]?.results || [];

if (rows.length === 0) {
  console.log('No conversations yet.');
  process.exit(0);
}

let currentConvo = null;
for (const row of rows) {
  if (row.conversation_id !== currentConvo) {
    currentConvo = row.conversation_id;
    console.log('\n' + '='.repeat(60));
    console.log('Conversation: ' + row.conversation_id.slice(0, 8) + '...');
    console.log('Started: ' + row.started + ' | Origin: ' + row.origin + ' | IP: ' + (row.client_ip || '—'));
    console.log('='.repeat(60));
  }
  const prefix = row.role === 'user' ? '👤 User' : '🐸 Mr. Minami';
  console.log('\n' + prefix + ' (' + row.sent_at + '):');
  console.log(row.content);
}
console.log();
"
