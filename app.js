require("dotenv").config();

var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/user");
var rolesRouter = require("./routes/role");
var facultiesRouter = require("./routes/faculty");
var eventsRouter = require("./routes/event");
var contributionsRouter = require("./routes/contribution");
var commentsRouter = require("./routes/comment");

var mongoose = require("mongoose");
var cors = require("cors");

// const db = "mongodb://localhost:27017/comp1640"; // local database url connection
// const db = process.env.DB_CONNECTION_STRING; // database url connection
const db =
	"mongodb+srv://kienptgch200815:s3klELOzHOcr9Uer@cluster0.yunqwou.mongodb.net/comp1640"; // database url connection
var app = express();

mongoose
	.connect(db)
	.then(() => console.log("Connected to db successfully!"))
	.catch((err) => console.log("Failed to connect to db. \nError: " + err));

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/roles", rolesRouter);
app.use("/faculties", facultiesRouter);
app.use("/events", eventsRouter);
app.use("/contributions", contributionsRouter);
app.use("/comments", commentsRouter);

module.exports = app;
