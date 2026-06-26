# 📊 Assignment Backend – Excel to Charts & PDF Generator

A Node.js + Express backend that processes Excel files, generates charts, and creates downloadable PDF reports.

---

## 🚀 Features

- Upload Excel files (.xlsx / .xls)
- Read latest uploaded file automatically
- Generate Bar & Pie charts using Chart.js (Node Canvas)
- Save charts as PNG images
- Generate PDF reports with embedded charts
- Serve static files (charts, reports, uploads)

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- Chart.js
- chartjs-node-canvas
- PDFKit
- xlsx
- fs & path modules

---

## 📁 Project Structure

backend/
│
├── src/
│   ├── charts/        # Generated PNG charts
│   ├── reports/       # Generated PDF reports
│   ├── uploads/       # Uploaded Excel files
│   ├── controllers/   # Business logic
│   ├── routes/        # API routes
│   └── app.js         # Express setup
│
├── server.js
├── package.json
└── .env

---

## ⚙️ Installation

```bash id="b1"
git clone https://github.com/sahil-mane/assignment-backend
cd assignment-backend
npm install
