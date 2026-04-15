import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`cd /var/www/mira/client && npm run build`, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
    stream.on('close', () => {
      console.log('Build completed!');
      conn.end();
    });
  });
}).connect({
  host: '217.26.29.171',
  port: 22,
  username: 'root',
  password: '9PRh&I!dYmMS',
  readyTimeout: 10000
});
