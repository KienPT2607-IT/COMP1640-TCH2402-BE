require("dotenv").config();

var express = require("express");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middlewares/auth");
const { getUploadMiddleware, removeFiles } = require("../middlewares/upload");
const { processContribution } = require("../utilities/process_contribution");
const fs = require("fs");
const archiver = require("archiver");
const path = require("path");
const { contributionBasePath } = require("../utilities/constants");
var router = express.Router();

// * Add contribution. ✅
/**
 * @swagger
 * /create:
 *   post:
 *     summary: Add a new contribution
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               event:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: The contribution was successfully added.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Some server error.
 */
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
			res.status(500).json({
				error: error.message,
			});
		}
	}
);

// * GET contributions listing ✅
// - Only the accepted contributions will be shown.
/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Retrieve the accepted contributions for a specific event
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The event ID
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: A list of accepted contributions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contribution'
 *       404:
 *         description: No contributions found
 */
router.get(
	"/event/:id",
	isAuth(["Marketing Manager", "Marketing Coordinator", "Student"]),
	async (req, res) => {
		try {
			let contributions = await ContributionModel.find({
				event: req.params.id,
				is_accepted: true,
			}).populate("contributor");

			if (contributions.length === 0)
				return res.status(400).json({
					message: "No contributions found!",
				});

			let results = contributions.map((each) => {
				let contribution = processContribution(each);
				return contribution;
			});
			res.status(200).json({
				data: results,
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

// * GET contributions listing ✅
// - Only the request contributions will be shown.
/**
 * @swagger
 * /requests:
 *   get:
 *     summary: Retrieve the requested contributions
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: A list of requested contributions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contribution'
 *       404:
 *         description: No contributions found
 *       500:
 *         description: Some server error
 */
router.get("/requests", isAuth(["Marketing Coordinator"]), async (req, res) => {
	try {
		let contributions = await ContributionModel.find({
			is_accepted: false,
		})
			.populate("contributor")
			.populate({ path: "event", match: { create_by: req._id } })
			.then((contributions) => {
				// Filter out contributions with null 'event' field
				return contributions.filter(
					(contribution) => contribution.event !== null
				);
			});
		if (contributions.length <= 0)
			return res.status(404).json({ message: "No contributions found!" });

		let results = contributions.map((each) => {
			let contribution = processContribution(each);
			contribution.event_name = contribution.event.name;
			delete contribution.event;
			return contribution;
		});
		res.status(200).json({ data: results });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Accept contribution by id ✅
// - Only the event creator can accept the contributions.
/**
 * @swagger
 * /accept/{id}:
 *   put:
 *     summary: Accept a contribution by ID
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The contribution ID
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: The contribution was successfully accepted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: You are not authorized to accept this contribution!
 *       404:
 *         description: Contribution not found!
 *       500:
 *         description: Some server error.
 */
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
/**
 * @swagger
 * /update/{id}:
 *   put:
 *     summary: Update a contribution by id
 *     description: Only the contributor can update and only accepted contributions are updatable.
 *     tags:
 *       - Contributions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the contribution to update
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The updated content of the contribution
 *               event:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Contribution updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution updated!
 *       404:
 *         description: Contribution not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution not found!
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put(
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

//  * Reject contribution by id 90%✅
// - Only the event creator can reject the contributions.
/**
 * @swagger
 * /reject/{id}:
 *   delete:
 *     summary: Reject a contribution by ID
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The contribution ID
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: The contribution was successfully rejected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Contribution not found or not authorized
 *       500:
 *         description: Some server error.
 */
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
/**
 * @swagger
 * /delete/{id}:
 *   delete:
 *     summary: Delete a contribution by ID
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The contribution ID
 *       - in: header
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: The contribution was successfully deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Contribution not found
 *       500:
 *         description: Some server error.
 */
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
// - Only the students can like the accepted contributions.
/**
 * @swagger
 * /like/{id}:
 *   put:
 *     summary: Like a contribution by id
 *     description: Only authenticated students can like and only accepted contributions are likable.
 *     tags:
 *       - Contributions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the contribution to like
 *       - in: header
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contribution liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution liked!
 *       404:
 *         description: Contribution not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution not found!
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

// * Unlike contribution. ✅
// - Only the students can unlike the accepted contributions.
/**
 * @swagger
 * /unlike/{id}:
 *   put:
 *     summary: Like a contribution by id
 *     description: Only authenticated students can like and only accepted contributions are likable.
 *     tags:
 *       - Contributions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the contribution to like
 *       - in: header
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contribution liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution liked!
 *       404:
 *         description: Contribution not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution not found!
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

// * Dislike contribution. ✅
// - Only the students can dislike the accepted contributions.
/**
 * @swagger
 * /dislike/{id}:
 *   put:
 *     summary: Like a contribution by id
 *     description: Only authenticated students can like and only accepted contributions are likable.
 *     tags:
 *       - Contributions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the contribution to like
 *       - in: header
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contribution liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution liked!
 *       404:
 *         description: Contribution not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution not found!
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

// * Un-dislike contribution. ✅
// - Only the students can dislike the accepted contributions.
/**
 * @swagger
 * /undislike/{id}:
 *   put:
 *     summary: Like a contribution by id
 *     description: Only authenticated students can like and only accepted contributions are likable.
 *     tags:
 *       - Contributions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the contribution to like
 *       - in: header
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contribution liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution liked!
 *       404:
 *         description: Contribution not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contribution not found!
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
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

// * Download contributions ✅
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
