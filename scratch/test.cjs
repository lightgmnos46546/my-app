const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
    console.log("Starting server...");
    const server = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), shell: true });
    
    await new Promise(r => setTimeout(r, 5000));

    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // We want to capture downloaded files
    const downloadPath = process.cwd() + '\\scratch\\downloads';
    if (!fs.existsSync(downloadPath)){
        fs.mkdirSync(downloadPath, { recursive: true });
    }
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadPath,
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for the table to render
    try {
        await page.waitForSelector('#pilot-hrs-table-S-92A', { timeout: 10000 });
        console.log("Table found!");
    } catch (e) {
        console.log("Table not found!");
    }

    const styles = await page.evaluate(() => {
        const ths = Array.from(document.querySelectorAll('#pilot-hrs-table-S-92A thead tr:nth-child(2) th'));
        // Find a Saturday and a Sunday dynamically
        // Since we don't know the exact date in the test environment (could be any month), 
        // we'll just pull out a few styles from the top header to confirm SOME are purple/red
        const colors = ths.map(th => window.getComputedStyle(th).backgroundColor).filter(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && !c.includes('0.02'));
        
        // Let's also find the first pilot name to ensure Nicknames are stripped
        const firstPilotName = document.querySelector('#pilot-hrs-table-S-92A tbody tr td:nth-child(2)').innerText;

        return {
            uniqueBgColors: [...new Set(colors)],
            firstPilotName
        };
    });
    console.log("Styles:", styles);

    // Test Export
    console.log("Clicking Export button...");
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.innerText && b.innerText.includes('Export Excel V2'));
        if (target) {
            target.click();
            console.log("Clicked Export!");
        } else {
            console.log("Export button not found!");
        }
    });

    // Wait for file download
    console.log("Waiting 5 seconds for file to download...");
    await new Promise(r => setTimeout(r, 5000));
    
    const files = fs.readdirSync(downloadPath);
    console.log("Downloaded files:", files);

    await browser.close();
    server.kill();
    process.exit(0);
})();
