require("dotenv").config();
const { isAuth } = require("../middlewares/auth");

var express = require("express");
var router = express.Router();

router.get("/", isAuth(["Student"]))

module.exports = router;
