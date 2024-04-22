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
const { Types } = require("mongoose");
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
			const doc = await ContributionModel.findById(
				req.params.id
			).populate({ path: "contributor", match: { _id: req._id } });
			if (!doc)
				return res.status(404).json({
					message: "Contribution not found!",
				});

			doc.content = req.body.content;
			if (!req._files) {
				removeFiles(doc.uploads, `${doc.event._id}/${req._id}`);
				doc.uploads = req._files;
			}
			await doc.save();
			res.status(200).json({
				message: "Contribution updated!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

// * Delete contribution by id. ✅
// - Only the Marketing Coordinator, contributor can delete his/her contribution.
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
router.delete(
	"/delete/:id",
	isAuth(["Student", "Marketing Coordinator"]),
	async (req, res) => {
		try {
			const doc = await ContributionModel.findOne({
				_id: req.params.id,
			})
				.populate("contributor")
				.populate("event");

			if (!doc)
				return res.status(404).json({
					message: "Contribution not found!",
				});
			// Get the current date
			// Compare the current date with the event's date
			const currentDate = new Date();
			if (doc.event.closure_date < currentDate) {
				return res.status(400).json({
					message: "The event has closed!",
				});
			}

			if (
				req.role == "Student" &&
				doc.contributor._id.toString() != req._id
			) {
				return res.status(401).json({
					message:
						"Not authorized to perform this action, authorization denied!",
				});
			}
			removeFiles(doc.uploads, `${doc.event._id}/${doc.contributor._id}`);
			await ContributionModel.findByIdAndDelete(req.params.id);
			res.status(200).json({
				message: "Contribution deleted!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

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
		const doc = await ContributionModel.findById(req.params.id);

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
		const doc = await ContributionModel.findById(req.params.id);

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
		const doc = await ContributionModel.findById(req.params.id);

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

module.exports = router;
