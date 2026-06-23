const puppeteer = require('puppeteer-core');
const fs = require('fs');

function resolveBundledChromePath() {
    const cacheRoot = `${process.env.HOME}/.cache/puppeteer/chrome`;
    if (!fs.existsSync(cacheRoot)) {
        return null;
    }

    const versions = fs.readdirSync(cacheRoot).sort().reverse();
    for (const version of versions) {
        const candidate = `${cacheRoot}/${version}/chrome-linux64/chrome`;
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function run() {
    const executablePath = process.argv[2] || resolveBundledChromePath() || '/usr/bin/google-chrome-stable';
    console.log('CHROME', executablePath);

    const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        timeout: 120000,
        pipe: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });

    const page = await browser.newPage();
    await page.goto('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
    });

    console.log('GOTO_OK', page.url());
    await browser.close();
}

run().catch((error) => {
    console.error('PUPPETEER_FAIL', error.message);
    process.exit(1);
});
