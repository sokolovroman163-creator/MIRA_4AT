import { Client } from 'ssh2';
import { readFileSync, writeFileSync } from 'fs';

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

// Prepare file reads
const filesToUpload = [
  { local: 'server/src/index.ts', remote: '/var/www/mira/server/src/index.ts' },
  { local: 'server/src/socket/handlers/message.ts', remote: '/var/www/mira/server/src/socket/handlers/message.ts' },
  { local: 'server/src/routes/messages.ts', remote: '/var/www/mira/server/src/routes/messages.ts' },
  { local: 'client/src/pages/ChatPage.tsx', remote: '/var/www/mira/client/src/pages/ChatPage.tsx' },
  { local: 'client/src/store/messageStore.ts', remote: '/var/www/mira/client/src/store/messageStore.ts' }
];

conn.on('ready', async () => {
  console.log('=== SSH Connected — Deploying Ultra-Fix ===\n');

  try {
    // 1. Upload all files
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

    console.log('\n--- Ultra-Fix Deployment Complete ---');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.end();
  }
}).connect({
  host: '217.26.29.171', port: 22, username: 'root', password: '9PRh&I!dYmMS'
});
