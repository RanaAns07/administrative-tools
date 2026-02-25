import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const apiDir = path.join(process.cwd(), 'src/app/api');
let modifiedCount = 0;

walkDir(apiDir, function (filePath) {
    if (filePath.endsWith('route.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('export async function GET') && !content.includes("export const dynamic = 'force-dynamic';")) {
            content = "export const dynamic = 'force-dynamic';\n" + content;
            fs.writeFileSync(filePath, content, 'utf8');
            modifiedCount++;
        }
    }
});

console.log(`Successfully made ${modifiedCount} API routes dynamic.`);
