import puppeteer from 'puppeteer'

export async function generatePdf(deckUrl: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(deckUrl, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      width: '1920px',
      height: '1080px',
      printBackground: true,
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
