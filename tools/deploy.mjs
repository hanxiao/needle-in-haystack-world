// Publish the single-file build into the public hanxiao.github.io Pages repo,
// under needle-in-haystack-world/index.html, without touching any other file.
//
//   node tools/deploy.mjs            build + commit + push + wait for Pages + verify live
//   node tools/deploy.mjs --dry      build + create objects, no ref update
//   node tools/deploy.mjs --no-build reuse dist/index.html
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const SITE_REPO = 'hanxiao/hanxiao.github.io';
const BRANCH = 'master';
const FILE_PATH = 'needle-in-haystack-world/index.html';
const LIVE_URL = 'https://hanxiao.io/needle-in-haystack-world/';
const AUTHOR = { name: 'Han Xiao', email: 'han.xiao@jina.ai' };

const dry = process.argv.includes('--dry');
const noBuild = process.argv.includes('--no-build');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!noBuild) {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}

let html = await readFile('dist/index.html', 'utf8');
const rawHash = createHash('sha256').update(html).digest('hex');
const hash = rawHash.slice(0, 12);
if (!html.includes('name="build"')) {
  html = html.replace('</head>', `<meta name="build" content="${hash}" />\n</head>`);
}
const bytes = Buffer.from(html);
const sizeMb = (bytes.length / 1024 / 1024).toFixed(2);
console.log(`build ${hash} · ${sizeMb} MB`);

const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();

async function api(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'nihw-deploy',
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${opts.method || 'GET'} ${path}\n${text.slice(0, 600)}`);
  }
  return res.status === 204 ? null : res.json();
}

// 1. create blob + tree on top of current head
const blob = await api(`/repos/${SITE_REPO}/git/blobs`, {
  method: 'POST',
  body: JSON.stringify({ content: bytes.toString('base64'), encoding: 'base64' }),
});
console.log(`blob ${blob.sha}`);

async function commitOnce() {
  const ref = await api(`/repos/${SITE_REPO}/git/ref/heads/${BRANCH}`);
  const head = ref.object.sha;
  const headCommit = await api(`/repos/${SITE_REPO}/git/commits/${head}`);
  const tree = await api(`/repos/${SITE_REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: [{ path: FILE_PATH, mode: '100644', type: 'blob', sha: blob.sha }],
    }),
  });
  const commit = await api(`/repos/${SITE_REPO}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `needle-in-haystack-world: ${hash}`,
      tree: tree.sha,
      parents: [head],
      author: { ...AUTHOR, date: new Date().toISOString() },
      committer: { ...AUTHOR, date: new Date().toISOString() },
    }),
  });
  return { head, commit };
}

let result = await commitOnce();
if (!dry) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await api(`/repos/${SITE_REPO}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: result.commit.sha, force: false }),
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      console.log('ref moved under us, retrying…');
      await sleep(1500);
      result = await commitOnce();
    }
  }
  console.log(`pushed ${result.commit.sha} to ${SITE_REPO}@${BRANCH}`);
}

if (dry) {
  console.log(JSON.stringify({ hash, sizeMb, commit: result.commit.sha, dry: true }, null, 2));
  process.exit(0);
}

// 2. wait for the Pages build for this commit
let built = false;
for (let i = 0; i < 60; i++) {
  const build = await api(`/repos/${SITE_REPO}/pages/builds/latest`);
  if (build.status === 'built' && build.commit === result.commit.sha) {
    built = true;
    console.log(`pages built in ${(i + 1) * 5}s`);
    break;
  }
  await sleep(5000);
}
if (!built) console.log('pages build not confirmed in 300s (continuing to verify)');

// 3. verify the live URL serves this exact build
let verified = false;
for (let i = 0; i < 20; i++) {
  try {
    const res = await fetch(`${LIVE_URL}?v=${hash}`, { cache: 'no-store' });
    const body = await res.text();
    if (res.ok && body.includes(`content="${hash}"`)) {
      verified = true;
      console.log(`live ✓ ${LIVE_URL} (${body.length} bytes)`);
      break;
    }
    console.log(`live check: status ${res.status}, build marker ${body.includes(hash) ? 'found' : 'missing'}`);
  } catch (err) {
    console.log(`live check failed: ${err.message}`);
  }
  await sleep(6000);
}

console.log(JSON.stringify({ hash, sizeMb, commit: result.commit.sha, url: LIVE_URL, verified }, null, 2));
if (!verified) process.exitCode = 2;
