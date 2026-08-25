const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="text"]', 'recav1@edu.net');
  await page.type('input[type="password"]', 'Sch@123');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  console.log("URL after login:", page.url());
  
  await browser.close();
})();
