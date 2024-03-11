require("dotenv").config();

var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");
const FacultyModel = require("../models/FacultyModel");
const RoleModel = require("../models/RoleModel");
const { getCurrentDate } = require("../utilities/date");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { isAdmin } = require("../middlewares/auth");
const tokenSecret = process.env.TOKEN_SECRET_KEY;
const saltRounds = process.env.SALT_ROUNDS;

// * GET users listing.
router.get("/", async (req, res) => {
	try {
		let users = await UserModel.find();
		console.log(users.length);

		res.status(200).json({
			data: users,
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(404).json({
			error: error.message,
		});
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		let user = await UserModel.findOne({
			email: email,
		})
			.select("+password")
			.populate("faculty")
			.populate("role"); // "+" = allow select hidden field
		if (!user) {
			return res.status(400).json({
				message: "User with this email does not exist!",
			});
		}

		const isPassMatch = await bcrypt.compare(password, user.password);
		if (!isPassMatch) {
			return res.status(400).json({
				message: "Incorrect password!",
			});
		}
		const token = jwt.sign(
			{ _id: user._id, role: user.role.name },
			tokenSecret
		);
		res.status(200).json({
			token: token,
			data: user,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			error: error.message,
		});
	}
});

router.post("/create-user", isAdmin, async (req, res) => {
	try {
		const {
			full_name,
			email,
			password,
			dob,
			gender,
			phone_number,
			profile_picture,
			faculty,
			role,
		} = req.body;
		const _faculty = await FacultyModel.findOne({ name: faculty });
		if (!_faculty)
			return res.status(400).json({
				message: "Faculty not found!",
			});
		const _role = await RoleModel.findOne({ name: role });
		if (!_role)
			return res.status(400).json({
				message: "Role not found!",
			});
		const hashedPass = await bcrypt.hash(password, saltRounds);
		await UserModel.create({
			full_name: full_name,
			email: email,
			password: hashedPass,
			dob: dob,
			phone_number: phone_number,
			gender: gender,
			profile_picture: profile_picture,
			registration_date: getCurrentDate(),
			faculty: _faculty._id,
			role: _role._id,
		});
		res.status(201).json({
			message: "Account added successfully!",
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(500).json({
			error: error.message,
		});
	}
});
module.exports = router;
