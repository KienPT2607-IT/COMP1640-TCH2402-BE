var express = require("express");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middlewares/auth");
const { getUploadMiddleware } = require("../middlewares/upload");
// const { clearDirectory } = require("../middlewares/upload");
const { contributionBasePath } = require("../utilities/constants");
const { Types } = require("mongoose");
const multer = require("multer");
const upload = multer();

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
				document_des_path: `${event}/${req._id}`,
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
/**
 * @swagger
 * /event/{id}:
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
			});

			if (contributions.length === 0) {
				res.status(404).json({
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
/**
 * @swagger
 * /view/requests:
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
router.get(
	"/view/requests",
	isAuth(["Marketing Coordinator"]),
	async (req, res) => {
		try {
			let contributions = await ContributionModel.find({
				is_accepted: false,
			}).populate({ path: "event", match: { create_by: req._id } });
			if (contributions.length <= 0) {
				return res.status(404).json({
					message: "No contributions found!",
				});
			}
			res.status(200).json({
				data: contributions,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({
				error: error.message,
			});
		}
	}
);

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

// TODO: Need to be fixed the updating of files
// * Update contribution by id
// - Only the contributor can update and only accepted contributions are updatable.
router.post(
	"/update/:id",
	isAuth(["Student"]),
	// getUploadMiddleware("contributions", "documents", 5),
	async (req, res) => {
		try {
			// Todo: Save the updated files in the new des path and delete the old path
			console.log(req.body);
			const contribution = await ContributionModel.findOne({
				_id: req.params.id,
			}).populate({ path: "contributor", match: { _id: req._id } });
			if (!contribution)
				return res.status(404).json({
					message: "Contribution not found!",
				});
			if (!contribution.is_accepted)
				return res.status(403).json({
					message: "Only accepted contributions are updatable!",
				});

			contribution.content = req.body.content;
			await contribution.save();
			res.status(200).json({
				message: "Contribution updated!",
			});
		} catch (error) {
			console.log(error);
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
			const contribution = await ContributionModel.findOne({
				_id: req.params.id,
			}).populate({ path: "event", match: { creator: req._id } });

			if (!contribution)
				return res.status(404).json({
					message: "Contribution not found or not authorization",
				});

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
// - Only the contributor and the event creator can delete and only accepted contributions are deletable.
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
			const contribution = await ContributionModel.findOne({
				_id: req.params.id,
				is_accepted: true,
			}).populate({ path: "event", match: { creator: req._id } });

			if (!contribution)
				return res.status(404).json({
					message: "Contribution not found!",
				});

			await ContributionModel.findByIdAndDelete(req.params.id);
			// Todo: Delete the folder of this contribution.
			res.status(200).json({
				message: "Contribution deleted!",
			});
		} catch (error) {
			res.status(500).json({ error: error.message });
		}
	}
);

// * Like contribution. 
// - Only the students can like the accepted contributions.
router.put("/like/:id", isAuth(["Student"]), async (req, res) => {
	try {
		var contribution = await ContributionModel.findOne({
			id: req.params.id,
			is_accepted: true,
		});
		if (!contribution)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		contribution.like_count += 1;
		await contribution.save();
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
		var contribution = await ContributionModel.findOne({
			id: req.params.id,
			is_accepted: true,
		});
		if (!contribution)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		contribution.like_count -= 1;
		await contribution.save();
		res.status(200).json({
			message: "Contribution unliked!",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Dislike contribution.
// - Only the students can dislike the accepted contributions.
router.put("/dislike/:id", isAuth(["Student"]), async (req, res) => {
	try {
		var contribution = await ContributionModel.findOne({
			id: req.params.id,
			is_accepted: true,
		});
		if (!contribution)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		contribution.dislike_count += 1;
		await contribution.save();
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
		var contribution = await ContributionModel.findOne({
			id: req.params.id,
			is_accepted: true,
		});
		if (!contribution)
			return res.status(404).json({
				message: "Contribution not found!",
			});
		contribution.dislike_count -= 1;
		await contribution.save();
		res.status(200).json({
			message: "Contribution un-disliked!",
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// * Download contributions

module.exports = router;
