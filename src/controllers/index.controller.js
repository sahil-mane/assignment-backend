const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { Chart } = require("chart.js");
const ChartDataLabels = require("chartjs-plugin-datalabels");
const PDFDocument = require("pdfkit");

module.exports = {
	uploadExcel: async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: "Please upload an Excel file.",
				});
			}

			const filePath = path.resolve(req.file.path);

			// Read Workbook
			const workbook = xlsx.readFile(filePath);

			// First Sheet
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];

			// Read as Array
			const rows = xlsx.utils.sheet_to_json(sheet, {
				header: 1,
				defval: "",
			});

			// Extract Life Factors
			const factors = rows.slice(2, rows.length - 1).map((row) => ({
				factor: row[0],
				mother: Number(row[1]),
				father: Number(row[2]),
				total: Number(row[3]),
				minimum: Number(row[4]),
				maximum: Number(row[5]),
			}));

			// Extract Total Row
			const totalRow = rows[rows.length - 1];

			const summary = {
				motherTotal: Number(totalRow[1]),
				fatherTotal: Number(totalRow[2]),
				overallTotal: Number(totalRow[3]),
			};

			return res.status(200).json({
				success: true,
				message: "Excel uploaded successfully.",
				totalFactors: factors.length,
				factors,
				summary,
			});
		} catch (error) {
			console.error(error);

			return res.status(500).json({
				success: false,
				message: error.message,
			});
		}
	},
	analyzeData: async (req, res) => {
		try {
			const uploadDir = path.join(__dirname, "../uploads");

			// Get all Excel files
			const files = fs
				.readdirSync(uploadDir)
				.filter(
					(file) =>
						file.endsWith(".xlsx") || file.endsWith(".xls")
				);

			if (files.length === 0) {
				return res.status(404).json({
					success: false,
					message: "No uploaded Excel file found.",
				});
			}

			// Get latest uploaded file
			const latestFile = files
				.map((file) => ({
					file,
					time: fs.statSync(path.join(uploadDir, file)).mtime.getTime(),
				}))
				.sort((a, b) => b.time - a.time)[0].file;

			const filePath = path.join(uploadDir, latestFile);

			// Read Excel
			const workbook = xlsx.readFile(filePath);
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];

			const rows = xlsx.utils.sheet_to_json(sheet, {
				header: 1,
				defval: "",
			});

			// Factors
			const factors = rows
				.slice(2)
				.filter(
					(row) =>
						row[0] &&
						row[0] !== "TOTAL"
				)
				.map((row) => ({
					factor: row[0],
					mother: Number(row[1]),
					father: Number(row[2]),
					total: Number(row[3]),
					minimum: Number(row[4]),
					maximum: Number(row[5]),
				}));

			// Total Row
			const totalRow = rows.find((row) => row[0] === "TOTAL");

			const summary = {
				motherTotal: Number(totalRow[1]),
				fatherTotal: Number(totalRow[2]),
				overallTotal: Number(totalRow[3]),
			};

			// Validation
			const isValid =
				Number((summary.motherTotal + summary.fatherTotal).toFixed(3)) ===
				Number(summary.overallTotal.toFixed(3));

			// Mother Highest
			const motherHighest = factors.reduce((a, b) =>
				a.mother > b.mother ? a : b
			);

			// Mother Lowest
			const motherLowest = factors.reduce((a, b) =>
				a.mother < b.mother ? a : b
			);

			// Father Highest
			const fatherHighest = factors.reduce((a, b) =>
				a.father > b.father ? a : b
			);

			// Father Lowest
			const fatherLowest = factors.reduce((a, b) =>
				a.father < b.father ? a : b
			);

			return res.status(200).json({
				success: true,
				message: "Analysis completed successfully.",

				validation: {
					motherTotal: summary.motherTotal,
					fatherTotal: summary.fatherTotal,
					overallTotal: summary.overallTotal,
					isValid,
				},

				mother: {
					highest: {
						factor: motherHighest.factor,
						value: motherHighest.mother,
					},
					lowest: {
						factor: motherLowest.factor,
						value: motherLowest.mother,
					},
				},

				father: {
					highest: {
						factor: fatherHighest.factor,
						value: fatherHighest.father,
					},
					lowest: {
						factor: fatherLowest.factor,
						value: fatherLowest.father,
					},
				},

				comparison: factors,
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				message: error.message,
			});
		}
	},
	generateData: async (req, res) => {
		try {
			const { birthDate } = req.body;

			if (!birthDate) {
				return res.status(400).json({
					success: false,
					message: "birthDate is required.",
				});
			}

			const day = new Date(birthDate).getDate();

			if (isNaN(day)) {
				return res.status(400).json({
					success: false,
					message: "Invalid birthDate",
				});
			}

			const isOdd = day % 2 !== 0;

			// Read latest uploaded excel
			const uploadDir = path.join(__dirname, "../uploads");

			const files = fs
				.readdirSync(uploadDir)
				.filter(
					(file) =>
						file.endsWith(".xlsx") || file.endsWith(".xls")
				);

			if (!files.length) {
				return res.status(404).json({
					success: false,
					message: "Please upload excel first.",
				});
			}

			const latestFile = files
				.map((file) => ({
					file,
					time: fs.statSync(path.join(uploadDir, file)).mtime.getTime(),
				}))
				.sort((a, b) => b.time - a.time)[0].file;

			const workbook = xlsx.readFile(path.join(uploadDir, latestFile));

			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			const rows = xlsx.utils.sheet_to_json(sheet, {
				header: 1,
				defval: "",
			});

			const factors = rows
				.slice(2)
				.filter((row) => row[0] && row[0] !== "TOTAL")
				.map((row) => ({
					factor: row[0],
					min: Number(row[4]),
					max: Number(row[5]),
				}));

			const generated = [];

			let motherTotal = 0;
			let fatherTotal = 0;

			factors.forEach((factor) => {
				let mother;
				let father;

				if (isOdd) {
					mother = Number(
						(
							factor.min +
							Math.random() * (factor.max - factor.min)
						).toFixed(3));

					father = Number(
						(
							factor.min +
							Math.random() * (mother - factor.min)
						).toFixed(3));
				} else {
					father = Number(
						(
							factor.min +
							Math.random() * (factor.max - factor.min)
						).toFixed(3));

					mother = Number(
						(
							factor.min +
							Math.random() * (father - factor.min)
						).toFixed(3));
				}

				motherTotal += mother;
				fatherTotal += father;

				generated.push({
					factor: factor.factor,
					mother,
					father,
				});
			});

			// Normalize to 100
			const total = motherTotal + fatherTotal;
			const ratio = 100 / total;

			motherTotal = 0;
			fatherTotal = 0;

			generated.forEach((item) => {
				item.mother = Number((item.mother * ratio).toFixed(3));
				item.father = Number((item.father * ratio).toFixed(3));
				item.total = Number(
					(item.mother + item.father).toFixed(3)
				);

				motherTotal += item.mother;
				fatherTotal += item.father;
			});

			// Adjust last factor so overall total is exactly 100
			const currentTotal = Number(
				(motherTotal + fatherTotal).toFixed(3)
			);

			const diff = Number((100 - currentTotal).toFixed(3));

			generated[generated.length - 1].father += diff;
			generated[generated.length - 1].total = Number(
				(
					generated[generated.length - 1].mother +
					generated[generated.length - 1].father
				).toFixed(3)
			);

			fatherTotal += diff;

			return res.status(200).json({
				success: true,
				message: "Data generated successfully.",
				birthDate,
				dayType: isOdd ? "Odd" : "Even",
				ruleApplied: isOdd
					? "Mother values are higher."
					: "Father values are higher.",
				summary: {
					motherTotal: Number(motherTotal.toFixed(3)),
					fatherTotal: Number(fatherTotal.toFixed(3)),
					overallTotal: 100,
				},
				factors: generated,
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				message: error.message,
			});
		}
	},
	visualizeData: async (req, res) => {
		try {
			// =====================
			// BASE DIRECTORY FIX
			// =====================
			const BASE_DIR = path.resolve(__dirname, "..");

			const uploadDir = path.join(BASE_DIR, "uploads");
			const chartDir = path.join(BASE_DIR, "charts");

			if (!fs.existsSync(chartDir)) {
				fs.mkdirSync(chartDir);
			}

			// =====================
			// GET LATEST EXCEL FILE
			// =====================
			const files = fs
				.readdirSync(uploadDir)
				.filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));

			if (!files.length) {
				return res.status(404).json({
					success: false,
					message: "Upload Excel file first",
				});
			}

			const latestFile = files
				.map((file) => ({
					file,
					time: fs.statSync(path.join(uploadDir, file)).mtime.getTime(),
				}))
				.sort((a, b) => b.time - a.time)[0].file;

			const workbook = xlsx.readFile(path.join(uploadDir, latestFile));
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			const rows = xlsx.utils.sheet_to_json(sheet, {
				header: 1,
				defval: "",
			});

			// =====================
			// PARSE DATA SAFELY
			// =====================
			const factors = rows
				.slice(2)
				.filter((r) => r[0] && r[0] !== "TOTAL")
				.map((r) => ({
					factor: r[0],
					mother: Number(r[1]) || 0,
					father: Number(r[2]) || 0,
				}));

			const totalRow = rows.find((r) => r[0] === "TOTAL") || [];

			const motherTotal = Number(totalRow[1]) || 0;
			const fatherTotal = Number(totalRow[2]) || 0;

			// =====================
			// CHART SETUP
			// =====================
			const chartCanvas = new ChartJSNodeCanvas({
				width: 1000,
				height: 700,
				backgroundColour: "white",
			});

			// =====================
			// BAR CHART
			// =====================
			const barConfig = {
				type: "bar",
				data: {
					labels: factors.map((f) => f.factor),
					datasets: [
						{
							label: "Mother",
							data: factors.map((f) => f.mother),
							backgroundColor: "#ff6384",
						},
						{
							label: "Father",
							data: factors.map((f) => f.father),
							backgroundColor: "#36a2eb",
						},
					],
				},
				options: {
					responsive: false,
					plugins: {
						title: {
							display: true,
							text: "Mother vs Father Comparison",
						},
						legend: {
							position: "top",
						},
					},
					scales: {
						y: {
							beginAtZero: true,
						},
					},
				},
			};

			const barBuffer = await chartCanvas.renderToBuffer(barConfig);

			fs.writeFileSync(path.join(chartDir, "bar-chart.png"), barBuffer);

			// =====================
			// PIE CHART
			// =====================
			const pieConfig = {
				type: "pie",
				data: {
					labels: ["Mother", "Father"],
					datasets: [
						{
							data: [motherTotal, fatherTotal],
							backgroundColor: ["#ff6384", "#36a2eb"],
						},
					],
				},
				options: {
					responsive: false,
					plugins: {
						title: {
							display: true,
							text: "Overall Contribution",
						},
					},
				},
			};

			const pieBuffer = await chartCanvas.renderToBuffer(pieConfig);

			fs.writeFileSync(path.join(chartDir, "pie-chart.png"), pieBuffer);

			// =====================
			// RESPONSE
			// =====================
			return res.status(200).json({
				success: true,
				message: "Charts generated successfully",
				barChart: "/charts/bar-chart.png",
				pieChart: "/charts/pie-chart.png",
			});
		} catch (error) {
			console.error(error);
			return res.status(500).json({
				success: false,
				message: error.message,
			});
		}
	},
	generateReport: async (req, res) => {
		try {
			const BASE_DIR = path.resolve(__dirname, "..");

			const uploadDir = path.join(BASE_DIR, "uploads");
			const reportDir = path.join(BASE_DIR, "reports");
			const chartDir = path.join(BASE_DIR, "charts");

			if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

			// ======================
			// GET EXCEL FILE
			// ======================
			const files = fs
				.readdirSync(uploadDir)
				.filter((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));

			if (!files.length) {
				return res.status(404).json({
					success: false,
					message: "Upload Excel first",
				});
			}

			const latestFile = files
				.map((file) => ({
					file,
					time: fs.statSync(path.join(uploadDir, file)).mtime.getTime(),
				}))
				.sort((a, b) => b.time - a.time)[0].file;

			const workbook = xlsx.readFile(path.join(uploadDir, latestFile));
			const sheet = workbook.Sheets[workbook.SheetNames[0]];

			const rows = xlsx.utils.sheet_to_json(sheet, {
				header: 1,
				defval: "",
			});

			const factors = rows
				.slice(2)
				.filter((r) => r[0] && r[0] !== "TOTAL")
				.map((r) => ({
					factor: r[0],
					mother: Number(r[1]) || 0,
					father: Number(r[2]) || 0,
					total: Number(r[3]) || 0,
				}));

			const totalRow = rows.find((r) => r[0] === "TOTAL") || [];

			const motherTotal = Number(totalRow[1]) || 0;
			const fatherTotal = Number(totalRow[2]) || 0;
			const overallTotal = Number(totalRow[3]) || 0;

			// ======================
			// REPORT FILE
			// ======================
			const fileName = `report-${Date.now()}.pdf`;
			const reportPath = path.join(reportDir, fileName);

			const doc = new PDFDocument({ margin: 50 });

			await new Promise((resolve, reject) => {
				const stream = fs.createWriteStream(reportPath);
				doc.pipe(stream);

				// TITLE
				doc.fontSize(20).text("Parental Legacy Report", {
					align: "center",
				});

				doc.moveDown();

				// SUMMARY
				doc.fontSize(14).text("Summary");
				doc.fontSize(12).text(`Mother: ${motherTotal}`);
				doc.text(`Father: ${fatherTotal}`);
				doc.text(`Total: ${overallTotal}`);

				doc.moveDown();

				// FACTORS
				doc.fontSize(14).text("Factors");

				factors.forEach((f, i) => {
					doc.fontSize(12).text(`${i + 1}. ${f.factor}`);
					doc.text(`Mother: ${f.mother}`);
					doc.text(`Father: ${f.father}`);
					doc.text(`Total: ${f.total}`);
					doc.moveDown();
				});

				// ======================
				// 🔥 ADD CHARTS HERE
				// ======================

				const barPath = path.join(chartDir, "bar-chart.png");
				const piePath = path.join(chartDir, "pie-chart.png");

				if (fs.existsSync(barPath)) {
					doc.addPage();
					doc.fontSize(16).text("Bar Chart", { align: "center" });
					doc.moveDown();

					doc.image(barPath, {
						fit: [450, 300],
						align: "center",
					});
				}

				if (fs.existsSync(piePath)) {
					doc.addPage();
					doc.fontSize(16).text("Pie Chart", { align: "center" });
					doc.moveDown();

					doc.image(piePath, {
						fit: [400, 400],
						align: "center",
					});
				}

				doc.end();

				stream.on("finish", resolve);
				stream.on("error", reject);
			});

			return res.status(200).json({
				success: true,
				message: "Report generated successfully",
				reportUrl: `/reports/${fileName}`,
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				message: error.message,
			});
		}
	}
}