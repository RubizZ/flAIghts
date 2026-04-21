const fs = require('fs');
const path = require('path');

const esFile = fs.readFileSync('c:/Users/nicor/tfg/flAIghts/frontend/src/i18n/languages/es.json', 'utf8');
const es = JSON.parse(esFile);

function checkKey(obj, key) {
    const parts = key.split('.');
    let curr = obj;
    for (let p of parts) {
        if (curr[p] === undefined) return false;
        curr = curr[p];
    }
    return true;
}

const files = [];
function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (let entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
}

walk('c:/Users/nicor/tfg/flAIghts/frontend/src');

const regex = /t\(['"]([^'"]+)['"]/g; // matches t('key.example'
const toastRegex = /toast\.[\w]+\(['"]([^'"]+)['"]/g;

let missingKeys = new Set();
let missingToasts = new Set();

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!checkKey(es, match[1])) {
            missingKeys.add(match[1]);
        }
    }
    while ((match = toastRegex.exec(content)) !== null) {
        // Some toasts might not use t(), check if string is hardcoded
        // But if it's not a t() call, it means it's missing i18n completely.
        missingToasts.add({file: f, str: match[1]});
    }
});

console.log('Missing translation keys in current es.json:');
missingKeys.forEach(k => console.log(' - ' + k));
console.log('\nHardcoded toast strings (might need translation):');
missingToasts.forEach(t => console.log(' - ' + t.str + ' in ' + t.file));
