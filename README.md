# Eco

**Money, markets and minds from first principles.** An interactive course covering economics, finance, private equity, stock markets, bonds, derivatives, the consultant's toolkit, and the behavioural psychology behind every price.

There are 94 lessons across 15 worlds. Every lesson has simulations you can drag, predictions to commit to before the answer is shown, worked exercises, an "on the job" section on how professionals use the idea, an "Insider's view" (how the powerful really play it, where the legal line is, and a real case file), a set of terms, and a short quiz that ends with a real-world situation.

## The worlds

| # | World | What's inside |
|---|-------|---------------|
| 1 | First principles | Scarcity, opportunity cost, incentives, thinking at the margin, trade |
| 2 | Markets | Supply and demand, elasticity, price controls, externalities, monopoly, game theory, information |
| 3 | Money & banks | What money is, how banks create it, central banks, inflation, exchange rates |
| 4 | The whole economy | GDP, jobs, the business cycle, fiscal policy, trade, growth |
| 5 | Time & money | Compounding, present value, NPV and IRR, risk, diversification, personal finance |
| 6 | Accounting | The three statements, how they link, ratios, working capital |
| 7 | Valuation & corporate finance | Enterprise value, multiples, WACC, DCF, capital structure, payouts, M&A |
| 8 | Stock markets | Shares, IPOs, the order book, indices, efficient markets, CAPM, short selling |
| 9 | Bonds & credit | Bond pricing, duration, credit spreads, the yield curve |
| 10 | Derivatives | Forwards and futures, options, option pricing, swaps, hedging |
| 11 | Private markets | PE funds, LBOs, returns and carry, venture capital, cap tables, hedge funds, real estate, investment banking |
| 12 | Mind & money | Two systems, prospect theory, anchoring, mental accounting, present bias, herding, nudges, persuasion, negotiation |
| 13 | Consultant's toolkit | MECE and issue trees, market sizing, unit economics, frameworks, pricing, break-even, a full case |
| 14 | Crashes & crises | Bank runs, leverage spirals, 2008, bubbles |
| 15 | Power & the rules | Who writes the rules, how the rich use them, tax games, insider trading, manipulation, fraud, monopoly power, ethical dilemmas |

The course also has these pages:

- **Paths**: curated routes through the worlds, such as "Think like a consultant", "Break into PE & banking", "Invest without getting fooled", "Understand the news", "The psychology of money" and "How the game is really played".
- **Glossary**: every term, A to Z, searchable, with links back to the lesson that teaches it.
- **Practice**: a quick-fire quiz, a "situation room" of real-world scenarios, a "weak spots" round, and spaced-repetition flashcards.
- **Concept web**: every lesson and how it connects to the others.

## Run it

You need Node 18 or later. There are no dependencies and no build step.

```bash
npm run dev
```

Then open http://localhost:4173. Set `PORT` to use a different port.

## Test it

```bash
npm test
```

The test needs Playwright. It opens every lesson and page on a desktop and a phone viewport. It moves every slider and presses every button, choice and exercise, then fails on any page error, any broken request, or any sideways overflow. Pass a world or lesson id to test just that part, for example `node test/smoke.mjs private` or `node test/smoke.mjs lbo`.

## How it's built

- Plain ES modules, DOM and SVG. No framework.
- `lib/core.js` holds the DOM helpers, number formatting and local progress storage.
- `lib/ui.js` holds the widgets: sliders, toggles, stat tiles, predict-then-reveal, numeric exercises, steppers and flip cards.
- `lib/chart.js` is a small SVG chart engine with a crosshair tooltip: line charts, columns, waterfalls and donuts.
- `lib/pixel.js` draws the pixel art: Penny the coin, Oink the piggy bank, and the world icons.
- `lib/catalog.js` lists the worlds and lessons. `content/<world>.js` holds each world's lessons as data: principle, hook, parts with simulations, job, terms, quiz, recap and links. `content/insider-a.js` and `content/insider-b.js` hold the Insider's view and situation question for each lesson.
- `lib/shell.js` renders a lesson. `lib/home.js`, `lib/glossary.js`, `lib/practice.js` and `lib/web.js` render the other pages.

Progress is kept in your browser's local storage. Nothing is sent anywhere.

*Educational content, not financial advice.*
