import fs from 'fs';
import path from 'path';

const basePath = path.join(process.cwd(), 'src');

const replacements = [
  'https://picsum.photos/id/42/800/800',
  'https://picsum.photos/id/63/800/800',
  'https://picsum.photos/id/113/800/800',
  'https://picsum.photos/id/225/800/800',
  'https://picsum.photos/id/250/800/800',
  'https://picsum.photos/id/326/800/800',
  'https://picsum.photos/id/373/800/800',
  'https://picsum.photos/id/431/800/800',
  'https://picsum.photos/id/436/800/800',
  'https://picsum.photos/id/1025/800/800',
  'https://picsum.photos/id/106/800/800',
  'https://picsum.photos/id/175/800/800',
  'https://picsum.photos/id/312/800/800',
];

let counter = 0;

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf-8');
      const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-]+\?q=\d+(&w=\d+)?(&fit=crop)?(&sig=\d+)?/g;
      const newContent = content.replace(regex, (match) => {
        const replacement = replacements[counter % replacements.length];
        counter++;
        return replacement;
      });
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

walkDir(basePath);
