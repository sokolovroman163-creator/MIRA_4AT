import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('pm2 logs mira-server --lines 100 --nostream', (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '217.26.29.171',
  port: 22,
  username: 'root',
  password: '9PRh&I!dYmMS',
  readyTimeout: 10000
});
