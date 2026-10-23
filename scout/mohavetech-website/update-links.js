const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const names = html.match(/https:\/\/([a-z0-9-]+)\.vercel\.app/g).map(u => u.replace('https://','').split('.')[0].replace(/-[a-z0-9]+$/,''));
console.log(names);
