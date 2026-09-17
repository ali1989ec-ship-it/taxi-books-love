# Cab Ledger

A phone-friendly taxi fare and expense tracker inspired by the **features** of [TaxiBooks on the App Store](https://apps.apple.com/gb/app/taxibooks/id1543530927). This is an independent implementation with its own name and design. The Apple listing and its screenshots were used as research references only.

## What works

- Add, edit, flag, search, and delete fares and expenses
- Organise by date, payment method, account, and tags
- View daily balances and totals by day, week, month, or year
- See payment-method and account breakdowns
- Save regular entries for reuse
- Export a CSV and download or restore a full JSON backup
- Responsive layout for phones, tablets, and computers

Data is stored in this browser's local storage. It does not sync across devices. Download backups regularly, especially before clearing browser data. No account or private server is needed.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
cd app
npm ci
npm run dev
```

Open the local URL shown in the terminal. For a production build:

```sh
npm run build
npm run preview
```

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the app from `app/` and uploads `app/dist` to GitHub Pages on pushes to `main`. The Vite base path is set for `https://ali1989ec-ship-it.github.io/taxi-books-love/`.

Pages uses **GitHub Actions** as the publishing source. Check the workflow run after each push and verify the live app before sharing its link.

## Reference screenshots

The App Store screenshots were downloaded to `reference/app-store/` locally at the user's request. They are intentionally ignored by Git and are not part of this repository. Source: https://apps.apple.com/gb/app/taxibooks/id1543530927

## Scope

This first version covers the core bookkeeping journey. It does not yet include iCloud sync, PDF reports, location lookup, or an installable iPhone package. CSV is a spreadsheet-friendly export, not an accounting or tax filing integration.
