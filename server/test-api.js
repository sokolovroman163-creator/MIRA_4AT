const fs = require('fs');
fetch('http://localhost:3000/api/messages/upload-audio', {
  method: 'POST',
  body: new FormData()
}).then(r => r.json()).then(console.log).catch(console.error);
