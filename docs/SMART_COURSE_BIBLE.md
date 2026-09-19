# CIRCLE S.M.A.R.T — Stage 1 course bible (v3, 19 Sep 2026)

One page every lesson author and reviewer follows so 21 days tell ONE consistent story.
File format: `docs/SMART_CONTENT_SCHEMA.md`. Built from the professor audits of 19 Sep 2026.

## The promise (how we describe Stage 1)
21 days, 3 weeks x 7. A complete beginner learns how the Indian market works, how to read a
chart, one risk rule, two rule-based strategies on paper, and a daily routine — with AI as the
analyst and the learner as the one who decides. Virtual money only. Process is scored, never profit.
Next step after Stage 1: **Stage 2, CIRCLE W.I.N.N.E.R.S**.

## House numbers (use exactly these everywhere)
| Rule | Value |
|---|---|
| Challenge capital (virtual) | Rs 10,00,000 (Rs 10 lakh) — the app's Portfolio page uses this. Examples may also show Rs 1,00,000 to make scaling obvious. |
| Risk per trade | 1% of capital (Rs 10,000 on the challenge capital) = 1R |
| Position size | quantity = (capital x 1%) / (entry - stop), rounded down |
| Max exposure per position | 25% of capital |
| Max open trades | 3 at a time (so at most 3R at risk) |
| Daily stop ("kill-switch for humans") | stop for the day after -2R (two full losses) |
| Weekly pause | pause and review after -5R in a week |
| Chart tools (the "4 tools") | EMA 20 + EMA 50 (one pair), RSI 14, ATR 14 — plus VWAP on intraday charts only |
| Swing stop | 1.5 x ATR(14) below entry |
| Default challenge strategy | EMA Pullback Swing (suits people with a day job). ORB is optional, only for those who can watch 9:15-11:00. |
| Opening range (ORB) | the first 15 minutes, 9:15-9:30; stop at the other side of the range; liquid cash stocks only |
| Paper trading starts | Day 12 |
| Samples | 30 trades minimum before judging a rule; 100 for confidence |

## Facts to state carefully (say "check the NSE/SEBI site for the latest" where it can change)
- Equity cash settlement is T+1 (an optional same-day cycle exists for a limited list of stocks — "check with your broker").
- NSE equity: pre-open 9:00-9:15, normal session 9:15-15:30 on trading days; holidays and Muhurat trading are announced by the exchange.
- Price bands / circuit limits are set by the exchange per stock; index-based market-wide circuit breakers exist. Do not list percentages.
- FII is now officially FPI (Foreign Portfolio Investor): write "FII/FPI".
- GTT is a broker facility, not an exchange order type; an SL order has a trigger price; a stop-loss does NOT promise your exit price (gaps, slippage, circuits, an SL-limit that does not fill).
- VWAP = sum(price x volume) / total volume since the session open; it resets every day.
- ATR averages the true range (which includes gaps) of the chart's own candles.
- Breakeven win-rate = 1 / (1 + reward:risk). 1:1 -> 50%, 1:1.5 -> 40%, 1:2 -> 33%.
- Loss recovery: -10% needs +11%, -25% needs +33%, -50% needs +100%.
- SEBI retail algo framework is operative law (since 1 Apr 2026): broker is the principal, algo orders carry an exchange Algo-ID, higher order rates need registration, unregistered algo sellers are barred. Do not print the threshold number — say "above the exchange-set order-rate limit".
- Taxes: concepts only, NO rates. Delivery gains = capital gains (short/long depends on holding period); intraday = speculative business income; F&O = business income; file the ITR on time to carry losses forward; keep contract notes; ask a CA.
- Costs: brokerage, STT, exchange charges, GST, stamp duty, SEBI fees are named as TERMS only; the learner reads the amounts in their own contract note. Never print a rate.

## Compliance lines (never break)
- The only F&O-loss statistic: "SEBI FY26 study (Aug 2026): 87.7% of individual F&O traders were in net loss, aggregate Rs 91,685 crore, average Rs 1.17 lakh per loss-making trader." Quote it as is. Never attach a cause to it ("because of leverage") — any explanation is the course's own teaching view, in a separate sentence.
- Never use the word "guarantee" (even negated) — CI blocks it. Say "promise" / "vada" / "वादा".
- No real stock names in examples: use NIFTY 50, BANKNIFTY, SENSEX, or made-up companies (Sharma Textiles Ltd, Gupta Cement Ltd, Bharat Pumps Ltd, Kiran Foods Ltd). No buy/sell calls, targets or return expectations anywhere.
- Stage 1 places NO F&O trades, not even on paper: "F&O = samjho, khelo mat".
- Broker-agnostic: no task may require opening a broker account. Offer the no-account path (TradingView free chart, the app's Portfolio page, Google Sheets).
- Never tell learners to join a tips channel; scam exercises use a mentor-made practice dataset.
- AI hygiene: never paste PAN, client ID, contract notes with personal data, passwords, OTPs or API keys into any AI. Never forward AI output to others as buy/sell calls (that can be unregistered advice).
- Internal notes ("pending sign-off", "draft") never appear in learner text.

## Voice
A mature, warm professor who has seen many beginners lose money and wants this one to last.
Plain words first, the term second. One idea per sentence. Indian everyday analogies (sabzi
mandi, cricket, railway reservation, Diwali sale, chai stall, kirana khata). Every topic ends
with something the learner can DO on a phone in a few minutes. No hype, no "unlock your
potential", no emoji, no exclamation marks in a row. Motivation is quiet and specific:
"Aaj aapne ek rule likha. Pro traders bhi yahin se shuru karte hain." — never a promise of money.

## Cast (story panels)
- **Mentor** — calm senior teacher, 25 years in markets, patient, asks questions before answering.
- **Aman** — 28, office job in Pune, impatient, loves tips and quick money, learns the hard way.
- **Priya** — 24, commerce graduate in Lucknow, careful, writes everything down, asks "why".
- **Tip-wala** — the WhatsApp/Telegram tip seller. Appears ONLY in scam stories; his promises are the lesson.
- **narrator** — a one-line scene caption.

## The 21 days (v3 sequence)
Week 1 — How the market works, and the language of price
1. How Indian markets actually run — SEBI, NSE/BSE, index, who trades (FII/FPI, DII, retail), demat vs trading account, KYC, the journey of an order (app -> broker -> exchange -> clearing corporation -> depository -> demat), T+1, market hours, circuits. Psychology: beginner's overconfidence.
2. Orders, liquidity and costs — market/limit/SL/SL-M, trigger price, GTT, bid/ask/spread/depth, slippage, delivery vs intraday (auto square-off), the contract note, tax heads as concepts. Psychology: the urge to act now.
3. Trader vs gambler: the maths — expectancy, win-rate vs payoff, breakeven win-rate, R-multiples, losing streaks, drawdown vs risk of ruin, loss-recovery asymmetry, the SEBI FY26 figure. Psychology: tips ka lalach.
4. AI as your co-pilot, and your scam radar — AI = analyst, human = trigger; Fact / Guess / Kachra; hallucination and knowledge cutoff; automation bias; data hygiene; do not become a tipster. Psychology: automation bias.
5. Charts, timeframes, candles and volume — line/bar/candle, timeframes, OHLC anatomy, candle colours, volume and average volume, adjusted prices, a free charting setup. Psychology: seeing patterns everywhere.
6. Trend, support/resistance and gaps — swing highs/lows, HH/HL, zones not lines, role reversal (a probability), false breakouts and volume, the four gap types, corporate-action gaps, circuit locks, five candle patterns defined. Psychology: level ka moh.
7. Weekend review + Quiz Game 1 + Shortcut Trap #1 — audit a practice set of 20 "tips" (dataset from the mentor), red-flag words, verify a SEBI registration, SCORES and SMART ODR, fake apps and WhatsApp "investment groups", Week 1 self-check.

Week 2 — Risk first, strategy second
8. Indicators that help (and their limits) — SMA vs EMA and lag, EMA 20/50, RSI 14, ATR 14, VWAP (intraday), the 4-tools rule. Psychology: indicator overload.
9. Risk and position sizing — the 1% rule, the sizing formula, 25% exposure cap, 3 open trades, stops that slip (gaps, circuits), correlation, the daily -2R stop. Psychology: "is baar bada lagata hoon".
10. Your style and the investing alternative — intraday vs swing vs positional vs investor, time you really have; index funds, ETFs, mutual funds, SIP, NAV, expense ratio (concept); IPO basics; emergency fund first, risk capital only, never borrowed money. Psychology: copying someone else's style.
11. Strategy #1: EMA Pullback Swing (the default challenge strategy) — rules, a free screener, entry convention, skip gaps past planned risk, 1.5 x ATR stop, relative strength vs NIFTY, corporate actions distort indicators. Psychology: impatience.
12. Paper trading day 1 and the AI trade journal — paper-trade rules that do not flatter you (fills, slippage, costs in R), journal fields and emotion tags, the adherence score (no-trade days count as adherence). Psychology: "paper hai, chalta hai".
13. Strategy #2: Opening Range Breakout (optional) — liquid cash stocks only, the 9:15-9:30 range, fakeouts, short-selling rules in cash (intraday only, square-off, auction risk), gap-open days, a starter no-trade list. Psychology: breakout FOMO.
14. Weekend review + Quiz Game 2 + Shortcut Trap #2 — fake backtests, paid groups and finfluencers, IPO "GMP / assured allotment" scams, a self-paced paper-trade review.

Week 3 — Build your system, protect yourself
15. A fundamental health-check with AI + corporate actions — the 5-check health filter, market-cap tiers and sectors, story bias; dividend, bonus, split, rights, buyback; record date vs ex-date. Psychology: story bias.
16. Algo Level 1: rules -> flowchart -> alerts — testable rules, flowcharts, screeners and alerts (alerts are not orders; daily-close timing), the SEBI retail algo framework. Psychology: wanting a magic bot.
17. Backtest Level 1, by hand — a 30-trade manual backtest, costs in R, look-ahead and survivorship bias, adjusted data, "past performance is not indicative of future results". Psychology: curve-fitting hope.
18. F&O basics only: samjho, khelo mat — futures (lot, margin, MTM, leverage), options (call/put, strike, premium, expiry, ITM/ATM/OTM, intrinsic vs time value, time decay), buyer vs seller payoff, physical settlement of stock F&O, OI/PCR as terms, the SEBI FY26 figure, the hedge idea (protective put, basis risk). Psychology: the lottery-ticket mind.
19. The event calendar and no-trade days — results, policy and budget dates (no rates), ex-dates, index events, global events; your no-trade rules; build your own calendar. Psychology: fear of missing the big day.
20. Psychology and your daily routine — FOMO, revenge, overtrading, loss aversion, sunk cost, confirmation bias, recency; the Daily Routine Card; the kill-switch for humans; your personal investor-protection checklist. Psychology: the ego after a loss.
21. Finale — Week 3 recap, Quiz Game 3 and the final exam, certificate criteria (including the practice artefact ladder), process-based challenge results, the road to Stage 2 CIRCLE W.I.N.N.E.R.S.
