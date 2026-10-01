# Spendly — Expense, Event & Shopping Tracker

A mobile-first, installable web app (React + Vite) for daily expenses and big occasions — house construction, weddings, festivals, trips. Track who you have to pay, what you've paid, what to buy, from whom, by when — with reminders and notifications.

## Run

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # production build in dist/
npm run preview
```

To use it on your phone: run `npm run dev -- --host`, open `http://<your-pc-ip>:5180` on the phone (same Wi-Fi), or deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages…). Notifications and "Install app" need **HTTPS** (or localhost), so use a deployed URL on the phone for those.

## Features

- **Categories → purposes** — every category has its own list of purposes, e.g. *Home Construction* → Cement, Bricks, Contractor, Mason & Labour, Paint, Tiles…; *Wedding* → Venue, Catering, Decoration, Bride clothing, Jewellery, Makeup & Mehendi, Photography, Invitation cards… Add a new purpose right inside the expense form, rename or delete any purpose or category (Settings → Categories, or "Edit purposes" in the form). Reports and events can be broken down by purpose.
- **Daily expenses** — fast entry from the + button: amount, category, purpose, date, payment method (Cash/UPI/Card/Bank/Cheque), note, optional event + person.
- **Events & projects** — budget, people & vendors with agreed / paid / left to pay, money received, spend by purpose, plus per-event **To buy** and **Reminders** tabs.
- **Shopping list** — item, quantity, approx. price, category + purpose, event, shop (saved contact or typed), shop phone, need-by date, priority, notes, optional reminder. Group by date / purpose / shop / event. Tick an item as **bought**: enter the actual price, and it's recorded as an expense under the right purpose and event. Share the list on WhatsApp.
- **Contacts** — shops, people, services: call, WhatsApp, SMS and open in Maps in one tap. On Android Chrome you can pick from phone contacts. Event vendors' numbers appear here too.
- **Reminders & notifications** — one-off or repeating (daily / weekly / monthly / yearly) reminders linked to events, vendors, shopping items or contacts. Snooze, mark as done, call from the reminder, add to Google Calendar or download an `.ics` for the phone calendar. Also an optional daily "log today's expenses" nudge and budget alerts at 80% / 100%.
- **Dues, reports, dark mode, backup/restore (JSON), CSV export, sample data.**

## How notifications work

There is no server, so notifications come from the app on your device:
- They fire while Spendly is open or in the background (best when installed: browser menu → *Install app* / *Add to Home screen*). Reminders you missed while the app was closed fire as soon as you open it.
- On **iPhone**, add Spendly to the Home Screen first (Safari → Share → Add to Home Screen) — iOS only allows web notifications for installed apps.
- For alerts **even when the app is fully closed**, use a reminder's ⋯ menu → *Add to Google Calendar* / *Save to phone calendar*; your calendar app will then alert you.

## Data

Everything is stored in this browser (`localStorage`, key `spendly-data`). No account, nothing leaves the device. Use **Settings → Download backup** regularly, and to move data to another phone or browser. Older saved data is migrated automatically.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Zustand (persisted), React Router, Recharts, Lucide icons, a small service worker (offline + notification clicks).
