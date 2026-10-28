# Jadual Penggantian PPM (PPKI)

A small web app for the PPKI section to produce the daily substitution slip for Pembantu Pengurusan Murid (PPM). The admin records who is absent, picks substitutes from the PPMs who are free, and prints an A4 landscape slip.

Built with plain HTML and JavaScript (no build step), hosted on GitHub Pages, with Firebase Authentication and Firestore for storage.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: layout, styles, and logic in one file |
| `contoh-5-ppm.csv` | Sample timetable for five PPMs rotating across three classes, for testing |
| `firebase-config.js` | Your Firebase settings. Fill in once and keep it when updating `index.html` |
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

### Checking workload before choosing a substitute

- In the **Gantian** dropdown, each free PPM is listed with their load for the day, for example `PPM SAMPEL 2 (kelas 6, ganti 1, bebas 3)`. This means 6 periods of their own classes, 1 substitution already given today, and 3 periods still free. The list is sorted with the lightest workload first.
- Below the list, **Pratonton beban PPM hari ini** shows every active PPM across the day's periods: their own class in each period, substitutions already chosen (yellow, with a +), and free periods (blank). The Bebas column turns red when a PPM has 2 or fewer free periods left. To change that limit, edit `HAD_PADAT` near the top of the script in `index.html`.
- The table updates as you pick substitutes, so you can spread the extra work evenly.

Periods: Monday to Thursday have periods 1-10, and Friday has periods 1-8. Each period is 30 minutes.

## Setup

### 1. Create the Firebase project
1. Go to the [Firebase console](https://console.firebase.google.com) and create a project (the free Spark plan is enough).
2. Add a **Web app** (the `</>` icon) and copy the `firebaseConfig` values.
3. Open `firebase-config.js` and replace the `GANTI` placeholders with your values. This is the only file that holds your settings, so when you receive an updated `index.html`, replace it and leave `firebase-config.js` alone.

### 2. Turn on login
1. Go to **Authentication → Sign-in method** and enable **Email/Password**.
2. Go to **Authentication → Users** and add each admin account manually. The app has no sign-up page.
3. If the console offers an option to disable user sign-up, turn it off so nobody else can create an account.

### 3. Create the database
1. Go to **Firestore Database** and create a database (choose a region close to you).
2. Open the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**.

### 4. Publish on GitHub Pages
1. Create a GitHub repository and upload `index.html` and `firebase-config.js`.
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
| `subjek` | Optional. Leave empty if not needed, or use a subject code such as `PK` |

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

### Adding and editing manually

- **Add a new PPM:** in **Tambah PPM baru**, type the name and click **Tambah dan isi jadual**. The timetable editor opens with an empty grid.
- **Edit an existing PPM:** click **Edit jadual** next to the name.
- **Fill a block quickly:** choose the day, the first and last period, the class and the subject, then click **Isi blok**. This overwrites those periods. **Kosongkan blok** clears them.
- **Edit single cells:** type `KELAS | SUBJEK` in a cell (for example `BIJAK | PK`), or clear the cell to remove the lesson.
- **Rename:** change the name at the top of the editor.
- Nothing is saved until you click **Simpan jadual**.

### Sample data

`contoh-5-ppm.csv` has five sample PPMs (PPM SAMPEL 1 to 5) who rotate through the classes CEKAL, BIJAK and RAJIN. Every period has one PPM in each of the three classes, and the other two PPMs are free, so you can test the substitute dropdown. The `subjek` column is left empty because PPMs do not teach a subject. Upload it from the **PPM dan jadual** tab. Delete the five samples before you load real timetables.

Untick **Aktif** for a PPM who has left or is on long leave. They will no longer appear as a substitute or in the absent list, but their timetable is kept.

## Printing

Click **Cetak** on the daily page. The browser print dialog opens with an A4 landscape layout containing: Tidak Hadir, Waktu, Alasan, Subjek, Kelas, Gantian, Tandatangan and Nota. In the print dialog, turn off "Headers and footers" for a cleaner slip.

## Data layout (Firestore)

- `ppm/{id}`: `{ nama, aktif, slots: { "Mon-4": { kelas, subjek }, ... } }`
- `subs/{YYYY-MM-DD}`: `{ absent: [{ ppm, alasan }], rows: [{ ppm, waktu, alasan, subjek, kelas, jenis, gantian, nota }] }`

Saved days store the actual values, so an old slip does not change if a timetable is edited later.

## Security notes

- The Firebase config in `firebase-config.js` is not secret. Access is protected by the login and the Firestore rules, so do not skip step 2 or 3 of the setup.
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