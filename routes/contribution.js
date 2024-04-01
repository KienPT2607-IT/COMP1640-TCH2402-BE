var express = require("express");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middlewares/auth");
const { getUploadMiddleware, removeFiles } = require("../middlewares/upload");
const fs = require("fs");
const archiver = require("archiver");
const path = require("path");
const { contributionBasePath } = require("../utilities/constants");
var router = express.Router();

// * Add contribution. ✅
router.post(
	"/create",
	isAuth(["Student"]),
	getUploadMiddleware("contributions", "documents", 5),
	async (req, res) => {
		try {
			const { content, event } = req.body;
			await ContributionModel.create({
				content: content,
				uploads: req._files,
				contributor: req._id,
				event: event,
			});
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

// * GET contributions listing ✅
// - Only the accepted contributions will be shown.
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

// * GET contributions listing ✅
// - Only the request contributions will be shown.
router.get(
	"/view/requests",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {
		try {
			let contributions = await ContributionModel.find({
				is_accepted: false,
			}).populate({ path: "event", match: { create_by: req._id } });
			if (contributions.length <= 0) {
				return res.status(400).json({
					message: "No contributions found!",
				});
			}
			res.status(200).json({
				data: contributions,
			});
		} catch (error) {
			res.status(500).json({
				error: error.message,
			});
		}
	}
);

// * Accept contribution by id ✅
// - Only the event creator can accept the contributions.
router.put(
	"/accept/:id",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {
		try {
			const contribution = await ContributionModel.findById(
				req.params.id
			).populate("event");
			if (!contribution)
				return res.status(404).json({
					message: "Contribution not found!",
				});
			if (contribution.event.create_by.toString() !== req._id)
				return res.status(403).json({
					message:
						"You are not authorized to accept this contribution!",
				});
			contribution.is_accepted = true;
			await contribution.save();
			res.status(200).json({
				message: "Contribution accepted!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

// * Update contribution by id
// - Only the contributor can update and only accepted contributions are updatable.
router.post(
	"/update/:id",
	isAuth(["Student"]),
	getUploadMiddleware("contributions", "documents", 5),
	async (req, res) => {
		try {
			const doc = await ContributionModel.findOne({
				_id: req.params.id,
				is_accepted: true,
			}).populate({ path: "contributor", match: { _id: req._id } });
			if (!doc)
				return res.status(404).json({
					message: "Contribution not found!",
				});

			doc.content = req.body.content;
			// TODO: Save the updated files and delete the old ones
			// TODO: -> Need to test
			removeFiles(doc.uploads, `${doc.event._id}/${req._id}`);
			doc.uploads = req._files;
			await doc.save();
			res.status(200).json({
				message: "Contribution updated!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

//  * Reject contribution by id
// - Only the event creator can reject the contributions.
router.delete(
	"/reject/:id",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {
		try {
			const doc = await ContributionModel.findById(
				req.params.id
			).populate({ path: "event", match: { create_by: req._id } });
			if (!doc)
				return res.status(404).json({
					message: "Contribution not found or not authorization",
				});
			// TODO: check if date now is over closure date

			removeFiles(doc.uploads, `${doc.event._id}/${doc.contributor}`);
			await ContributionModel.findByIdAndDelete(req.params.id);
			// Todo: Delete the folder of this contribution.
			res.status(200).json({
				message: "Contribution rejected!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

// * Delete contribution by id.
// - Only the contributor can delete his/her contribution.
router.delete("/delete/:id", isAuth(["Student"]), async (req, res) => {
	try {
		const doc = await ContributionModel.findOne({
			_id: req.params.id,
			is_accepted: true,
		}).populate({ path: "contributor", match: { _id: req._id } });
		// TODO: check if date now is over closure date
		if (!doc)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		removeFiles(doc.uploads, `${doc.event._id}/${doc.contributor._id}`);
		await ContributionModel.findByIdAndDelete(req.params.id);
		res.status(200).json({
			message: "Contribution deleted!",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Like contribution. ✅
// TODO: need to test again before present on 1/4
// - Only the students can like the accepted contributions.
router.put("/like/:id", isAuth(["Student"]), async (req, res) => {
	try {
		const doc = await ContributionModel.findOne({
			_id: req.params.id,
			is_accepted: true,
		});

		if (!doc)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		doc.like_count += 1;
		await doc.save();
		res.status(200).json({
			message: "Contribution liked!",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Unlike contribution.
// - Only the students can unlike the accepted contributions.
router.put("/unlike/:id", isAuth(["Student"]), async (req, res) => {
	try {
		const doc = await ContributionModel.findOne({
			_id: req.params.id,
			is_accepted: true,
		});

		if (!doc)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		if (doc.like_count > 0) {
			doc.like_count -= 1;
			await doc.save();
			return res.status(200).json({
				message: "Contribution unliked!",
			});
		}
		res.status(400).send("like count is zero!");
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Dislike contribution.
// - Only the students can dislike the accepted contributions.
router.put("/dislike/:id", isAuth(["Student"]), async (req, res) => {
	try {
		const doc = await ContributionModel.findOne({
			_id: req.params.id,
			is_accepted: true,
		});

		if (!doc)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		doc.dislike_count += 1;
		await doc.save();
		res.status(200).json({
			message: "Contribution disliked!",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Un-dislike contribution.
// - Only the students can dislike the accepted contributions.
router.put("/undislike/:id", isAuth(["Student"]), async (req, res) => {
	try {
		const doc = await ContributionModel.findOne({
			_id: req.params.id,
			is_accepted: true,
		});

		if (!doc)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		if (doc.dislike_count > 0) {
			doc.dislike_count -= 1;
			await doc.save();
			return res.status(200).json({
				message: "Contribution un-disliked!",
			});
		}
		res.status(400).send("dislike count is zero!");
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Download contributions
// Only marketing manger can download upload contributions in a event no matter if they are accepted or not
router.get("/download/:id", isAuth(["Marketing Manager"]), async (req, res) => {
	try {
		const docs = await ContributionModel.find({
			event: req.params.id,
		}).populate("event");
		if (!docs) {
			return res.status(404).json({
				message: "Contributions of this event not found!",
			});
		}

		const folderPath = `${contributionBasePath}/${req.params.id}`;
		// Create a zip file
		const zipPath = `./public/downloads/${docs[0].event.name}.zip`;
		const output = fs.createWriteStream(zipPath);
		const archive = archiver("zip", {
			zlib: { level: 9 },
		});
		archive.pipe(output);

		// Add all files in the folder to the zip
		const contributionFolders = fs.readdirSync(folderPath);
		contributionFolders.forEach((folder) => {
			const files = fs.readdirSync(path.join(folderPath, folder));
			files.forEach((file) => {
				const filePath = path.join(folderPath, folder, file);
				archive.file(filePath, { name: path.join(folder, file) });
			});
		});

		// Finalize the zip file
		archive.finalize();

		// Send the zip file as a response
		output.on("close", () => {
			res.download(zipPath, (err) => {
				if (err) {
					res.status(500).json({ error: error.message });
				} else {
					// Delete the file after sending it
					fs.unlinkSync(zipPath);
				}
			});
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
