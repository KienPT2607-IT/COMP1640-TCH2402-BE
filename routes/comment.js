var express = require("express");
const CommentModel = require("../models/CommentModel");
const { isAuth } = require("../middlewares/auth");
var router = express.Router();

module.exports = router;
