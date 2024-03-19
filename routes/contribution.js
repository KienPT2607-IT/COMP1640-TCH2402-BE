var express = require("express");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middlewares/auth");

const multer = require("multer");
var prefix = Date.now() + "_" + Math.floor(Math.random() * 1000);
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "./public/uploads/"); //set image upload location
	},
	filename: (req, file, cb) => {
		let fileName = prefix + file.originalname; //set final image name
		cb(null, fileName);
	},
});

const upload = multer({ storage: storage });

var router = express.Router();

// * Add contribution - Not done yet.
/* 
	TODO:
	// check if the user is a student 
	check if the files are valid
	check if the student is in the same faculty as the event
	check if the event is still open for contributions
*/
router.post(
	"/create",
	isAuth(["Student"]),
	upload.single("image"),
	async (req, res) => {
		try {
			// const { content, event } = req.body;
			const { content, event } = JSON.parse(req.body.data);
			const contribution = await ContributionModel.create({
				content: content,
				image: req.file.path,
				contributor: req._id,
				event: event,
			});
			console.log(contribution);
			res.status(200).json({
				message: "Contribution added successfully!",
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({
				error: error.message,
			});
		}
	}
);

// * GET contributions listing - Only the accepted contributions will be shown.
router.get(
	"/:id",
	isAuth(["Marketing Manager", "Marketing Coordinator", "Student"]),
	async (req, res) => {
		try {
			let contributions = await ContributionModel.find({
				event: req.params.id,
				is_accepted: true,
			});
			if (contributions.length === 0) {
				res.status(400).json({
					message: "No contributions found!",
				});
			}
			res.status(200).json({
				data: contributions,
			});
		} catch (error) {
			res.status(404).json({
				error: error.message,
			});
		}
	}
);

router.get(
	"/view-requests",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {
		try {
			let contributions = await ContributionModel.find({
				is_accepted: false,
				"event.create_by": req._id,
			}).populate("event");
			if (contributions.length <= 0) {
				res.status(400).json({
					message: "No contributions found!",
				});
			}
			res.status(200).json({
				data: contributions,
			});
		} catch (error) {
			res.status(404).json({
				error: error.message,
			});
		}
	}
);

router.put(
	"/accept/:id",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {}
);

// * Update contribution by id.
router.post("/update/id", isAuth(["Student"]), async (req, res) => {});

module.exports = router;
