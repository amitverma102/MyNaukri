const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Intercept network requests
  page.on('response', async (response) => {
    if (response.status() === 401) {
      console.log(`[401 UNAUTHORIZED] ${response.request().method()} ${response.url()}`);
      try {
        const text = await response.text();
        console.log(`[401 Body]:`, text);
      } catch(e) {}
    }
  });

  page.on('request', request => {
     if (request.url().includes('/api/')) {
        console.log(`[REQ] ${request.method()} ${request.url()} | Headers:`, Object.keys(request.headers()).includes('authorization'));
     }
  });

  console.log("Navigating to login...");
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  console.log("Filling form...");
  await page.type('input[type="text"]', 'EduTechAdmin');
  await page.type('input[type="password"]', 'Sch@123');
  
  console.log("Clicking submit...");
  await page.click('button[type="submit"]');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Current URL after 5s:", page.url());
  
  await browser.close();
})();
