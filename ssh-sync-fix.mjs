import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();

function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errOutput = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', data => { output += data.toString(); process.stdout.write(data); });
      stream.stderr.on('data', data => { errOutput += data.toString(); process.stderr.write(data); });
      stream.on('close', (code) => resolve({ output, errOutput, code }));
    });
  });
}

const filesToUpload = [
  { local: 'client/src/hooks/useSocket.ts', remote: '/var/www/mira/client/src/hooks/useSocket.ts' },
  { local: 'client/src/pages/ChatPage.tsx', remote: '/var/www/mira/client/src/pages/ChatPage.tsx' },
  { local: 'client/src/components/chat/VirtualizedMessageList.tsx', remote: '/var/www/mira/client/src/components/chat/VirtualizedMessageList.tsx' },
  { local: 'client/src/components/chat/MessageBubble.tsx', remote: '/var/www/mira/client/src/components/chat/MessageBubble.tsx' },
  { local: 'server/src/socket/handlers/message.ts', remote: '/var/www/mira/server/src/socket/handlers/message.ts' },
  { local: 'server/src/routes/messages.ts', remote: '/var/www/mira/server/src/routes/messages.ts' },
  { local: 'server/src/index.ts', remote: '/var/www/mira/server/src/index.ts' }
];

conn.on('ready', async () => {
  console.log('=== SSH Connected — Deploying Real-Time Fix ===\n');

  try {
    // 1. Upload files
    console.log('\n--- Uploading files ---');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        
        let completed = 0;
        filesToUpload.forEach(f => {
          const content = readFileSync(f.local);
          const ws = sftp.createWriteStream(f.remote);
          ws.write(content);
          ws.end();
          ws.on('close', () => {
            console.log(`${f.local} -> ${f.remote} OK`);
            completed++;
            if (completed === filesToUpload.length) {
              sftp.end();
              resolve();
            }
          });
          ws.on('error', reject);
        });
      });
    });

    // 2. Build Server
    console.log('\n--- Rebuilding Server ---');
    await runCommand(conn, 'cd /var/www/mira/server && npx tsc');
    await runCommand(conn, 'pm2 restart mira-server');

    // 3. Build Client
    console.log('\n--- Rebuilding Client ---');
    await runCommand(conn, 'cd /var/www/mira/client && npm run build');

    console.log('\n--- Deployment Complete ---');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.end();
  }
}).connect({
  host: '217.26.29.171', port: 22, username: 'root', password: '9PRh&I!dYmMS'
});
