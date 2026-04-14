import fs from 'fs';
fetch('http://localhost:3000/health').then(r=>r.text()).then(console.log).catch(console.error);
