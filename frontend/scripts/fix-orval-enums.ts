import fs from 'fs';
import path from 'path';

/**
 * Script to fix syntax errors in Orval-generated files.
 * Orval's generator (v8.5.1) fails to escape single quotes when using enum values as keys in TypeScript objects.
 * This script finds those problematic lines and escapes the internal quotes.
 */

const WORK_DIR = process.cwd();
const MODELS_DIR = path.join(WORK_DIR, 'src', 'api', 'generated', 'model');

if (!fs.existsSync(MODELS_DIR)) {
    console.log('No models directory found to fix.');
    process.exit(0);
}

const files = fs.readdirSync(MODELS_DIR).filter((f: string) => f.endsWith('.ts'));
let fixedFiles = 0;

for (const file of files) {
    const filePath = path.join(MODELS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex explanation:
    // ^(\s+)           -> Indentation
    // '(.+)'           -> The key part wrapped in single quotes (greedy matching to capture internal quotes)
    // \s*:\s*          -> Separator
    // '(.+)'           -> The value part wrapped in single quotes
    // (,?)$            -> Optional trailing comma
    // Note: We use a more careful matching to avoid capturing too much if multiple properties are on one line
    const regex = /^(\s+)'(.+)'\s*:\s*'(.+)'(,?)$/gm;
    
    const newContent = content.replace(regex, (match: string, indent: string, key: string, value: string, comma: string) => {
        // orval generates keys by normalizing values but doesn't escape quotes.
        // We restore the escape for any unescaped single quote.
        const escapedKey = key.replace(/(?<!\\)'/g, "\\'");
        const escapedValue = value.replace(/(?<!\\)'/g, "\\'");
        
        return `${indent}'${escapedKey}': '${escapedValue}'${comma}`;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        fixedFiles++;
    }
}

if (fixedFiles > 0) {
    console.log(`Successfully fixed syntax in ${fixedFiles} Orval-generated files.`);
} else {
    console.log('No syntax issues found in generated models.');
}
