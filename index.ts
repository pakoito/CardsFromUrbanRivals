import { write } from "bun";
import puppeteer from "puppeteer";
import { exists } from "fs/promises";

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
});

const launch = async (id: number) => {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      height: 1080,
      width: 1920,
      deviceScaleFactor: 3,
    });

    const res = await page.goto(
      `https://iclintz.com/characters/clan.php?ID=${id}`
    );
    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});

    const title = await page.title();
    const clan = title.split("| ")[1];
    console.log(`Starting clan [${clan}]`);

    console.log("Clicking the cookies!");
    const buttons = await page.$$("button");
    const as = await page.$$("a");
    await Promise.all([
      ...buttons.map(async (b) => {
        const is = await b.evaluate(
          (bb) =>
            (bb.textContent?.match(
              "^(Okay|OK|Accept|Accept all|Consent|Got it!)$"
            )?.length ?? 0) > 0
        );
        if (is) {
          console.log("Clicked the cookie on button!");
          b.click().catch(() => {});
        }
      }),
      ...as.map(async (b) => {
        const is = await b.evaluate(
          (bb) =>
            (bb.textContent?.match(
              "^(Okay|OK|Accept|Accept all|Consent|Got it!)$"
            )?.length ?? 0) > 0
        );
        if (is) {
          console.log("Clicked the cookie on a!");
          b.click().catch(() => {});
        }
      }),
    ]);

    const selector = ".cardName.cardFrame.urbanFont";
    const elements = await page.$$(selector);
    console.log(`Clan ${clan} has ${elements.length} cards`);

    let idx = 1;
    for (const element of elements) {
      const nameContainer = await element.$(".cardName.urbanFont");
      const name = await nameContainer?.evaluate((e) => e.textContent);
      const path = `./cards/${clan}/${name}.png`;
      if (name && !(await exists(path))) {
        const content = await element?.screenshot({ omitBackground: true });
        console.log(`-> Writing ${idx}/${elements.length}: ${name}`);
        await write(path, content);
      } else {
        console.log(`Skipping ${idx}/${elements.length}: ${name}`);
      }
      idx++;
    }
  } finally {
    await page.close();
  }
};

try {
  console.log("Start by fetching clan ids");
  const clans = await fetch("https://iclintz.com/characters/clan.php?ID=38");
  const htmlText = await clans.text();
  const results = [
    ...htmlText.matchAll(/href="\/characters\/clan\.php\?ID=\d+"/g),
  ]
    .flatMap((s) => s.map((ss) => Number(ss.split("=")[2].replaceAll('"', ""))))
    .sort((a, b) => a - b);

  let idx = 1;
  for (const id of results) {
    console.log(`===== Clan ${idx} of ${results.length} =====`);
    await launch(id);
    idx++;
  }
} finally {
  browser.close();
}
