import { write } from "bun";
import puppeteer from "puppeteer";
import { exists } from "fs/promises";

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
});

const info: Record<string, any> = {};

const debug = process.env.DEBUG ?? false;

const launch = async (id: number) => {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      height: 1080,
      width: 1920,
      deviceScaleFactor: 3,
    });

    const res = await page.goto(
      `https://iclintz.com/characters/clan.php?ID=${id}`,
      { waitUntil: ["load", "domcontentloaded", "networkidle2"] }
    );

    const title = await page.title();
    const clan = title.split("| ")[1];
    if (debug) {
      console.log(`Starting clan ${clan}`);
    }
    info[clan] = { _meta: { name: clan } };

    if (debug) {
      console.log("Clicking the cookies!");
    }
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
          if (debug) {
            console.log("Clicked the cookie on button!");
          }
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
          if (debug) {
            console.log("Clicked the cookie on a!");
          }
          b.click().catch(() => {});
        }
      }),
    ]);

    const selector = ".cardName.cardFrame.urbanFont";
    const elements = await page.$$(selector);
    console.log(`Clan ${clan} has ${elements.length} cards`);

    let idx = 1;
    let downloaded = 0;
    let skipped = 0;
    for (const element of elements) {
      const nameContainer = await element.$(".cardName.urbanFont");
      const name = await nameContainer?.evaluate((e) => e.textContent);
      const path = `./cards/${clan}/${name}.png`;
      if (name) {
        info[clan][name] = {};

        const bonusContainer = await (
          await element.$(".cardBonus")
        )?.$(".vcenterContent");
        const bonus = (
          await bonusContainer?.evaluate((e) => e.textContent)
        )?.replaceAll(/ ( +)|\n/g, "");
        info[clan][name].bonus = bonus;
        info[clan]["_meta"].bonus = bonus;

        info[clan][name].name = name;

        const powerContainer = await (
          await element.$(".cardPower")
        )?.$(".vcenterContent");
        const power = await powerContainer?.evaluate((e) => e.textContent);
        info[clan][name].power = power?.replaceAll(/ ( +)|\n/g, "");

        const attackContainer = await element.$(".cardPH");
        const attack = await attackContainer?.evaluate((e) =>
          Number(e.textContent)
        );
        info[clan][name].attack = attack;

        const damageContainer = await element.$(".cardPDD");
        const damage = await damageContainer?.evaluate((e) =>
          Number(e.textContent)
        );
        info[clan][name].damage = damage;

        const starsContainer = await element.$(".cardStars");
        const stars = await starsContainer?.evaluate(
          (e) => e.children.length - 1
        );
        info[clan][name].stars = stars;
      }

      if (name && !(await exists(path))) {
        const content = await element?.screenshot({ omitBackground: true });
        console.log(`-> Writing ${idx}/${elements.length}: ${name}`);
        await write(path, content);
        downloaded++;
      } else {
        if (debug) {
          console.log(`Skipping ${idx}/${elements.length}: ${name}`);
        }
        skipped++;
      }
      idx++;
    }
    console.log(`Updated ${downloaded} and skipped ${skipped} cards`);
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
  console.log("Writing index");
  await write("./cards/card_index.json", JSON.stringify(info, null, 2));
} finally {
  browser.close();
}
