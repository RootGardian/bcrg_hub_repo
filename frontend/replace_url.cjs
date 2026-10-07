const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.jsx') || file.endsWith('.js')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace 'http://localhost:5000/api/...' with `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/...`
    content = content.replace(/'http:\/\/localhost:5000(\/api[^']*)'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}$1`");
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log("Replacement complete.");
