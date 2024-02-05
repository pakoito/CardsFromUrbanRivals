# Urban Rivals Cards

It generates all cards from the game Urban Rivals. If you rerun it it will skip the cards you have already generated.

At the end of the run it generates a json file with all card info.

It takes ~30m to generate them all.

### Use

To install dependencies:

```bash
bun install
```

Then you'll need to update `executablePath` to your own. I ran this from WSL.

To run:

```bash
bun run index.ts
```

And you can clear your cards folder using:

```bash
bun run delett
```

### Note for the future

I wrote this to experiment on a lazy Sunday. If you find this a few years after 2024 there is a good chance it is broken.

I'd rather you forked it or sent a PR than asking me to fix it.
