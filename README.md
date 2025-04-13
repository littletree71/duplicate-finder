# 🔍 Duplicate Finder

A minimal and fast Electron-based tool to find and manage duplicate files across multiple folders.

## ✨ Features

- 🔍 Scan multiple folders for duplicate files
- 🧠 Match by filename, size, date, or MD5 hash
- 🖼️ Image preview with thumbnail support
- 🗂️ Extension filter (.jpg, .png, etc.)
- ❌ Safe delete to Recycle Bin with confirmation
- 📁 View selected folders in a card layout
- 🔎 Real-time result filtering by keyword
- 📝 Daily deletion log with open/view support

## 📦 How to Use

### Development

```bash
npm install
npm start
```

### Build Windows Executable

```bash
npm run build
```

The output will be located in the `dist/` folder.

## 📁 Project Structure

```
.
├── main.js            # Electron main process
├── index.html         # Renderer HTML
├── renderer.js        # UI logic and features
├── icon.png/.ico      # Application icon
├── LICENSE            # License file (MIT)
└── README.md
```

## 🧾 License

MIT © 2025 littletree71
