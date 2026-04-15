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

// Read the fixed client files
const useSocketTs = readFileSync('client/src/hooks/useSocket.ts', 'utf8');
const chatPageTsx = readFileSync('client/src/pages/ChatPage.tsx', 'utf8');
const appTsx = readFileSync('client/src/App.tsx', 'utf8');

conn.on('ready', async () => {
  console.log('=== SSH Connected — Deploying Final Client Fixes ===\n');

  try {
    // 1. Upload fixed client files
    console.log('\n--- Uploading fixed client files ---');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        
        const files = [
          { local: useSocketTs, remote: '/var/www/mira/client/src/hooks/useSocket.ts' },
          { local: chatPageTsx, remote: '/var/www/mira/client/src/pages/ChatPage.tsx' },
          { local: appTsx, remote: '/var/www/mira/client/src/App.tsx' }
        ];

        let completed = 0;
        files.forEach(f => {
          const ws = sftp.createWriteStream(f.remote);
          ws.write(f.local);
          ws.end();
          ws.on('close', () => {
            console.log(`${f.remote} uploaded`);
            completed++;
            if (completed === files.length) {
              sftp.end();
              resolve();
            }
          });
          ws.on('error', reject);
        });
      });
    });

    // 2. Build the client
    console.log('\n--- Building client ---');
    await runCommand(conn, 'cd /var/www/mira/client && npm run build');

    console.log('\n--- Client build completed successfully ---');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    conn.end();
  }
}).connect({
  host: '217.26.29.171',
  port: 22,
  username: 'root',
  password: '9PRh&I!dYmMS',
  readyTimeout: 15000
});
