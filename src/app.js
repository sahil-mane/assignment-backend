const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folders

const BASE_DIR = path.resolve(__dirname);

// Static folders
app.use("/uploads", express.static(path.join(BASE_DIR, "uploads")));
app.use("/charts", express.static(path.join(BASE_DIR, "charts")));
app.use("/reports", express.static(path.join(BASE_DIR, "reports")));

// Health Check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Parental Legacy API is running 🚀",
    });
});

// Routes
app.use("/api", require("./routes/index"));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

module.exports = app;