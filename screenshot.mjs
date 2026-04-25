import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

// Find next available index
const existing = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
const indices  = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(Boolean);
const nextIdx  = indices.length ? Math.max(...indices) + 1 : 1;

const filename = `screenshot-${nextIdx}${label}.png`;
const outPath  = path.join(screenshotsDir, filename);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 800)); // let fonts/images settle
await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
console.log(`Screenshot saved: temporary screenshots/${filename}`);
