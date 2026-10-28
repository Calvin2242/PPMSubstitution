# Jadual Penggantian PPM (PPKI)

A small web app for the PPKI section to produce the daily substitution slip for Pembantu Pengurusan Murid (PPM). The admin records who is absent, picks substitutes from the PPMs who are free, and prints an A4 landscape slip.

Built with plain HTML and JavaScript (no build step), hosted on GitHub Pages, with Firebase Authentication and Firestore for storage.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (layout, styles and script in one file) |
| `firestore.rules` | Security rules: only signed-in admins can read or write |
| `README.md` | This file |

## How it works

1. Each PPM's weekly timetable is stored once, by uploading a CSV (or editing in the grid).
2. On the day, the admin picks the date and adds the absent PPM with a reason.
3. The app creates one row for each period that PPM teaches that day.
4. For each row the admin chooses one of:
   - **Ganti**: pick a substitute. The list only shows PPMs who are free in that period and not already covering another class in the same period.
   - **Tiada ganti**: no substitute because the class is in another activity. A preset note is added.
   - **Pantauan**: monitored by the neighbouring class teacher and PPM. A preset note is added.
5. Notes can be edited freely. Click **Simpan** to keep the day, then **Cetak** to print.

Periods: Monday to Thursday have periods 1-10, and Friday has periods 1-8. Each period is 30 minutes.

## Setup

### 1. Create the Firebase project
1. Go to the [Firebase console](https://console.firebase.google.com) and create a project (the free Spark plan is enough).
2. Add a **Web app** (the `</>` icon) and copy the `firebaseConfig` values.
3. Open `index.html`, find `const firebaseConfig`, and replace the `GANTI` placeholders with your values.

### 2. Turn on login
1. Go to **Authentication → Sign-in method** and enable **Email/Password**.
2. Go to **Authentication → Users** and add each admin account manually. The app has no sign-up page.
3. If the console offers an option to disable user sign-up, turn it off so nobody else can create an account.

### 3. Create the database
1. Go to **Firestore Database** and create a database (choose a region close to you).
2. Open the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**.

### 4. Publish on GitHub Pages
1. Create a GitHub repository and upload `index.html` (and the other files if you like).
2. Go to **Settings → Pages**, set the source to your main branch, and save.
3. Add your site domain (for example `yourname.github.io`) in Firebase under **Authentication → Settings → Authorized domains**.
4. Open the site and sign in.

## Loading timetables (CSV)

Go to the **PPM dan jadual** tab and use **Muat turun sampel CSV** to get a template.

| Column | Meaning |
|---|---|
| `nama` | PPM name (stored in capitals) |
| `hari` | Isnin, Selasa, Rabu, Khamis, Jumaat (or Mon to Fri) |
| `mula` | First period of the lesson block |
| `tamat` | Last period of the lesson block |
| `kelas` | Class name, e.g. `BIJAK` or `CEKAL KSSM 5` |
| `subjek` | Subject code, e.g. `PK`, `PM`, `KOM` |

One row is one lesson block. A class that runs from period 4 to 6 is a single row with `mula` 4 and `tamat` 6.

```csv
nama,hari,mula,tamat,kelas,subjek
PPM CONTOH 1,Isnin,1,3,BIJAK,PK
PPM CONTOH 1,Isnin,9,10,CEKAL KSSM 5,PM
PPM CONTOH 1,Jumaat,1,2,EFISIEN KSSM 3,PM
```

Rules:
- Save the file as CSV. Excel files with commas or semicolons both work.
- Every row is checked before saving. If any row is wrong (unknown day, period out of range, overlapping lessons, empty name or class), nothing is saved and the problem rows are listed.
- Uploading replaces the full timetable of each PPM named in the file. PPMs not in the file are not touched. Use this at the start of each term.
- **Eksport semua jadual** downloads everything as a CSV in the same format, useful for editing in a spreadsheet and uploading again.

To fix a single lesson, click **Edit jadual** next to a PPM, type `KELAS | SUBJEK` in the cell (for example `BIJAK | PK`), and click **Simpan jadual**.

Untick **Aktif** for a PPM who has left or is on long leave. They will no longer appear as a substitute or in the absent list, but their timetable is kept.

## Printing

Click **Cetak** on the daily page. The browser print dialog opens with an A4 landscape layout containing: Tidak Hadir, Waktu, Alasan, Subjek, Kelas, Gantian, Tandatangan and Nota. In the print dialog, turn off "Headers and footers" for a cleaner slip.

## Data layout (Firestore)

- `ppm/{id}`: `{ nama, aktif, slots: { "Mon-4": { kelas, subjek }, ... } }`
- `subs/{YYYY-MM-DD}`: `{ absent: [{ ppm, alasan }], rows: [{ ppm, waktu, alasan, subjek, kelas, jenis, gantian, nota }] }`

Saved days store the actual values, so an old slip does not change if a timetable is edited later.

## Security notes

- The Firebase config in `index.html` is not secret. Access is protected by the login and the Firestore rules, so do not skip step 2 or 3 of the setup.
- The included rules allow any signed-in user full access. Only create accounts for people who should be admins.
- Staff names and timetables are stored in Firestore, so keep the Firebase project private to the school.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Login page appears but sign-in fails | Wrong email or password, or Email/Password sign-in is not enabled |
| Sign-in works but data does not load | Firestore rules not published, or the database was not created |
| `auth/unauthorized-domain` error | Add your GitHub Pages domain under Authorized domains |
| CSV upload says a column is missing | Header row must contain `nama, hari, mula, tamat, kelas, subjek` |
| A PPM does not appear as a substitute | They are marked inactive, absent that day, or have a lesson in that period |
| Print shows extra text at the top and bottom | Turn off "Headers and footers" in the print dialog |

## Possible next steps

- Drag-to-fill in the timetable grid
- A history page to reprint past days
- Separate admin and read-only accounts