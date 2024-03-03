var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");

/* GET users listing.
 * path: .../users/
 */
router.get("/", async (req, res) => {
	try {
		let users = await UserModel.find();
		res.status(200).json({
			data: users,
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(401).json({
			error: error,
		});
	}
});

module.exports = router;
