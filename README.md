# <img src="public/logo.svg" style="vertical-align: text-bottom" width="45"> Twitter Vault

Twitter Vault allows you to take control of your data. It imports your backed-up tweets (JSON/JSONL), stores them locally in your browser using IndexedDB, and provides a beautiful interface to browse your history without algorithms or internet tracking.

---

### Features

- **100% Private:** No servers. No APIs. Your data never leaves your device.
- **Activity Insights:** GitHub-style contribution graph to visualize your bookmarking habits over the years.
- **Multiple Views:**
  - **Grid:** Standard card view.
  - **Gallery:** Masonry layout optimized for artists and media collectors.
  - **List:** Compact, data-dense view for reading.
- **Powerful Search:** Instant full-text search across tweet content and author handles.
- **Organizer:** Group tweets by Author to see everything you've saved from a specific user.
- **Media Viewer:** Built-in lightbox to view high-res images and carousels.
- **Data Management:**
  - Import bookmarks/likes using `.json` exports from [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter).
  - Export to `.json`, `.jsonl`, or `.csv`.
  - Soft delete unwanted items.
  - Download a zip copy of saved bookmarks from a specific profile.

---

### Tech Stack

- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4)
- **Database:** Dexie.js (IndexedDB wrapper)
- **Icons:** Lucide React
- **Utils:** Date-fns, JSZip

---

### Getting Started

#### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

---

### Installation

#### 1. Clone the repository

```
  git clone https://github.com/keneji404/twitter-vault.git
  cd twitter-vault
```

#### 2. Install dependencies

```
  npm install
```

#### 3. Run the development server

```
  npm run dev
```

---

### Usage Guide

This app is designed to work best with bookmark exporters that provide clean JSON/JSONL exports, I recommend [Twitter Web Exporter](https://github.com/prinsss/twitter-web-exporter) which is free and open source.

#### 1. Installing Twitter Web Exporter

1. Install the browser extension [Tampermonkey](https://www.tampermonkey.net/).
2. Download the latest Twitter Web Exporter [here](https://github.com/prinsss/twitter-web-exporter/releases/latest/download/twitter-web-exporter.user.js).
3. Open Tampermonkey's dashboard through browser extension menu.
4. Drag and drop the `.js` file into the dashboard and click install.
5. Open your Twitter bookmarks/likes page and it will start fetching automatically.

#### 2. Getting your Data

1.  Export your Bookmarks or Likes as a `.json` or `.jsonl` file.
2.  Open **Twitter Vault**.
3.  Click the **Import** button in the top right.
4.  Select your file. The app will process the data and store it in your browser.

#### 3. Browsing

- Use the **Search Bar** to find specific text.
- Toggle between **Bookmarks** and **Likes** using the tabs.
- Click the **Layout Icons** (Grid, List, Gallery) to change how tweets are displayed.
- Click "Authors" to see a leaderboard of who you bookmark the most.

#### 4. Backup & Restore

- **Export:** Click the "Export" button to save a clean backup of your current database. This includes any items you've deleted or organized.
- **Reset:** Use the "Reset Database" button to wipe the local storage and start fresh.

---

### WiP Features

- Import User likes and view statistics
- Fetch your Bookmarks directly in the app (no more 3rd party exporter)

---

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project.
2. Create your feature branch `git checkout -b feature/someFeature`.
3. Commit your changes `git commit -m 'added someFeature'`.
4. Push to the branch `git push origin feature/someFeature`.
5. Open a Pull Request.

---

### License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<!-- <p align="center">
<small>keneji @2025</small>
</p> -->
