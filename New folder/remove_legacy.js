const fs = require('fs');

const file = 'script.js';
let content = fs.readFileSync(file, 'utf8');

// The marker where we start deleting
const startStr = `// --- Crew Management Tab ---`;
// The marker where we stop deleting
const endStr = `// Finally render bookings (FIXED: no longer trapped in reviewInput block)`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  content = content.substring(0, startIdx) + content.substring(endIdx);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully removed legacy admin code from script.js');
} else {
  console.log('Could not find start or end markers');
}
