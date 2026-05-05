const express = require("express");
const predracunController = require("../controllers/predracunController");

const router = express.Router();

router.post("/", predracunController.create);

module.exports = router;
