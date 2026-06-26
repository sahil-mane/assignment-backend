const router = require("express").Router();

const upload = require("../middleware/uploadMiddleware.js");
const indexController = require("../controllers/index.controller.js")

router.post("/upload",upload.single("file"), indexController?.uploadExcel);
router.get("/analyze",indexController.analyzeData );
router.post("/generate", indexController.generateData);
router.get("/visualize", indexController.visualizeData);
router.get("/report", indexController.generateReport);

module.exports = router;