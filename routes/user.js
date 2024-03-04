var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");

/* GET users listing.
 * path: .../users/
 */
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
		const { password, email } = req.body;
		console.log(email + " / " + password);
		let user = await UserModel.findOne({
			email: email,
			password: password,
		});
		console.log(user);
		res.status(200).json({
			data: user,
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(404).json({
			error: error.message,
		});
	}
});

router.post("/register", async (req, res) => {
	try {
		const {
			full_name,
			email,
			dob,
			gender,
			phone_number,
			profile_picture,
			created_by,
			role,
		} = req.body;
		let mngCoordinator = await UserModel.findById(created_by);
		await UserModel.create({
			full_name: full_name,
			email: email,
			dob: dob,
			phone_number: phone_number,
			gender: gender,
			profile_picture: profile_picture,
			registration_date: Date.now,
			faculty: mngCoordinator.faculty,
			created_by: created_by,
			role: role,
		});
		res.status(201).json({
			message: "Student added successfully!"
		})
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(404).json({
			error: error.message,
		});
	}
});
module.exports = router;
