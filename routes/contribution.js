var express = require("express");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middlewares/auth");

const multer = require("multer");
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "./public/uploads/documents/");
	},
	filename: (req, file, cb) => {
		const filename = Date.now() + "_" + file.originalname;
		cb(null, filename);
	},
});
var router = express.Router();

// * Add contribution - Not done yet.
router.post("/add", isAuth(["Student"]), async (req, res) => {
	try {
		const { event, description } = req.body;
		const contribution = new ContributionModel({
			event: event,
			description: description,
			student: req._id,
		});
		await contribution.save();
		res.status(200).json({
			message: "Contribution added successfully!",
		});
	} catch (error) {
		res.status(500).json({
			error: error.message,
		});
	}
});

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
