const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the Katalon demo site
    await page.goto('https://cms.demo.katalon.com/', { waitUntil: 'networkidle0' });

    // Click "Add to cart" for the first 4 items
    for (let i = 1; i <= 4; i++) {
      const addToCartSelector = `main#main > div:nth-child(2) > ul > li:nth-child(${i}) > div > a.button`;
      await page.waitForSelector(addToCartSelector);
      await page.click(addToCartSelector);
    }

    // Go to checkout page
    await page.goto('https://cms.demo.katalon.com/checkout', { waitUntil: 'networkidle0' });

    // Get all items from the order review table
    const items = await page.evaluate(() => {
      const rows = document.querySelectorAll('#order_review table tbody tr');
      return Array.from(rows).map(row => ({
        name: row.querySelector('td.product-name').textContent.trim(),
        price: row.querySelector('td.product-total').textContent.trim()
      }));
    });

    // Send response as JSON
    res.json({
      success: true,
      data: items,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error(e);
    res.json({
      success: false,
      error: e.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
