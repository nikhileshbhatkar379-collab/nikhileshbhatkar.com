// scripts/seed.js
// Extracts the DEFAULT_* data from auth.js (single source of truth) and either
// writes data/academy.json (CLI) or returns the seed object (imported by server.js).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.join(__dirname, '..');

function buildAuthSource() {
  return fs.readFileSync(path.join(repoRoot, 'auth.js'), 'utf8');
}

function generateSeed() {
  let authSrc = buildAuthSource();
  // auth.js declares the DEFAULT_* data with top-level `const`, which are scoped
  // to the script and not reachable from the sandbox global object. Append an
  // export statement at the end so we can read them back.
  authSrc += '\n;globalThis.__SEED = { DEFAULT_ADMIN, DEFAULT_STUDENTS, DEFAULT_NOTES, DEFAULT_NOTICES, DEFAULT_INQUIRIES, DEFAULT_PAPERS, DEFAULT_TEST_RESULTS, DEFAULT_ATTENDANCE, DEFAULT_DOUBTS, DEFAULT_RECEIPTS, DEFAULT_TIMETABLE, DEFAULT_TOPPERS, DEFAULT_QUIZ_QUESTIONS };';

  // auth.js uses localStorage/sessionStorage in some branches; stub them so it
  // loads cleanly under Node.
  const sandbox = {
    console,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {},
    document: {},
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(authSrc, sandbox);

  const seedData = sandbox.__SEED || {};
  return {
    meta: {
      version: '1.0',
      seededAt: new Date().toISOString(),
      source: 'auth.js DEFAULT_* constants',
    },
    admin: seedData.DEFAULT_ADMIN,
    facultyAccounts: [
      {
        username: 'amit',
        email: 'amit.pawaskar@academy.com',
        password: 'amit123',
        name: 'Amit Pawaskar',
        role: 'faculty',
      },
    ],
    students: seedData.DEFAULT_STUDENTS,
    notes: seedData.DEFAULT_NOTES,
    notices: seedData.DEFAULT_NOTICES,
    inquiries: seedData.DEFAULT_INQUIRIES,
    papers: seedData.DEFAULT_PAPERS,
    tests: seedData.DEFAULT_TEST_RESULTS,
    attendance: seedData.DEFAULT_ATTENDANCE,
    doubts: seedData.DEFAULT_DOUBTS,
    receipts: seedData.DEFAULT_RECEIPTS,
    timetable: seedData.DEFAULT_TIMETABLE,
    toppers: seedData.DEFAULT_TOPPERS,
    quizQuestions: seedData.DEFAULT_QUIZ_QUESTIONS,
    whatsappLogs: [],
  };
}

if (require.main === module) {
  const seed = generateSeed();
  const outPath = path.join(repoRoot, 'data', 'academy.json');
  fs.writeFileSync(outPath, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes)`);
}

module.exports = { generateSeed };