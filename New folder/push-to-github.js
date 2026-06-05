/**
 * push-to-github.js
 * Pushes changed files to GitHub repo using the GitHub REST API.
 * Usage: node push-to-github.js <GITHUB_TOKEN>
 */
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OWNER  = 'travelscaperev-jpg';
const REPO   = 'travelscape';
const BRANCH = 'main';
const PREFIX = 'New folder';   // files live inside this subfolder in the repo
const TOKEN  = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node push-to-github.js <GITHUB_PERSONAL_ACCESS_TOKEN>');
  console.error('\nTo get a token:');
  console.error('1. Go to https://github.com/settings/tokens');
  console.error('2. Click "Generate new token (classic)"');
  console.error('3. Check "repo" scope');
  console.error('4. Copy the token and run: node push-to-github.js YOUR_TOKEN_HERE');
  process.exit(1);
}

const FILES = [
  'dashboard-crud.js',
  'admin.html',
  'staff.html',
  'script.js',
];

function ghRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'travelscape-deploy',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getFileSha(filePath) {
  const ghPath = `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(PREFIX)}/${encodeURIComponent(filePath)}?ref=${BRANCH}`;
  const res = await ghRequest('GET', ghPath);
  if (res.status === 200) return res.body.sha;
  return null;
}

async function pushFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP: ${filePath} (not found locally)`);
    return;
  }
  const content = fs.readFileSync(fullPath);
  const contentB64 = content.toString('base64');
  const sha = await getFileSha(filePath);
  const ghPath = `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(PREFIX)}/${encodeURIComponent(filePath)}`;
  const body = {
    message: `Update ${filePath} - fix admin/staff dashboard CRUD`,
    content: contentB64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghRequest('PUT', ghPath, body);
  if (res.status === 200 || res.status === 201) {
    console.log(`  ✅ ${filePath} pushed successfully`);
  } else {
    console.error(`  ❌ ${filePath} failed (${res.status}):`, res.body.message || JSON.stringify(res.body));
  }
}

async function detectBranch() {
  // Try 'main' first
  const res = await ghRequest('GET', `/repos/${OWNER}/${REPO}/branches/main`);
  if (res.status === 200) return 'main';
  // Fall back to 'master'
  const res2 = await ghRequest('GET', `/repos/${OWNER}/${REPO}/branches/master`);
  if (res2.status === 200) return 'master';
  return 'main'; // default
}

async function main() {
  console.log(`\n🚀 Pushing files to GitHub: ${OWNER}/${REPO} / ${PREFIX}\n`);

  for (const file of FILES) {
    process.stdout.write(`  Pushing ${file}... `);
    await pushFile(file);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n✅ Done! Render will redeploy in ~1-2 minutes.');
  console.log('📌 Check: https://travelscape-backend-wudc.onrender.com/admin.html\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
