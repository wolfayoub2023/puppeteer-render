const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  let browser = null;

  const loadPage = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        console.log("Navigating to site...");
        await Promise.all([
          page.goto('https://cms.demo.katalon.com/', {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 60000
          }),
          new Promise(async (resolveNavigation) => {
            page.once('load', async () => {
              console.log("Page loaded");
              resolveNavigation();
            });
          })
        ]);

        console.log("Waiting for products...");
        await page.waitForSelector('.products', { timeout: 30000 });

        const products = await page.evaluate(() => {
          const items = document.querySelectorAll('.products li.product');
          return Array.from(items, item => ({
            name: item.querySelector('.woocommerce-loop-product__title')?.textContent?.trim() || 'Unknown',
            price: item.querySelector('.price')?.textContent?.trim() || 'N/A'
          })).slice(0, 4);
        });

        await page.close();
        resolve(products);
      } catch (error) {
        reject(error);
      }
    });
  };

  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      product: 'chrome',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      executablePath: process.env.NODE_ENV === "production"
        ? '/usr/bin/google-chrome-stable'
        : puppeteer.executablePath(),
    });

    const products = await loadPage();

    console.log("Scraping completed successfully");
    res.json({
      success: true,
      data: products,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error("Scraping failed with error:", e);
    res.json({
      success: false,
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("Browser closed successfully");
      } catch (e) {
        console.error("Error closing browser:", e);
      }
    }
  }
};

module.exports = { scrapeLogic };
