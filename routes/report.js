const express = require("express");
let router = express.Router();
const { isAuth } = require("../middlewares/auth");
const UserModel = require("../models/UserModel");
const ContributionModel = require("../models/ContributionModel");
const EventModel = require("../models/EventModel");

router.get("/", isAuth(["Marketing Manager", "Guest"]), async (req, res) => {
	try {
		const users = await UserModel.find();
		const contributions = await ContributionModel.find();
		const topLikedContributions = await getTopLikeContributions();
		const topDislikedContributions = await getTopDislikedContributions();

		const topEvents = await getTopEvents();
		return res.status(200).json({
			user_count: users.length,
			contribution_count: contributions.length,
			top_liked_contributions: topLikedContributions,
			top_disliked_contributions: topDislikedContributions,
			top_events: topEvents,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send();
	}
});

async function getTopDislikedContributions() {
	let topDislikedContributions = await ContributionModel.find()
		.sort({ dislike_count: -1 }) // Sort in descending order of likes
		.limit(3) // Limit to the top 3 documents
		.populate("event")
		.populate("contributor");
	topDislikedContributions = topDislikedContributions.map((each) => {
		let doc = each.toObject();
		delete doc.uploads;
		delete doc.like_count;
		delete doc.content;
		delete doc.submission_date;
		doc.event = doc.event ? doc.event.name : "Event not found";
		doc.contributor = doc.contributor
			? doc.contributor.full_name
			: "User not found";
		return doc;
	});
	return topDislikedContributions;
}

async function getTopLikeContributions() {
	let topLikedContributions = await ContributionModel.find()
		.sort({ like_count: -1 }) // Sort in descending order of likes
		.limit(3) // Limit to the top 3 documents
		.populate("event")
		.populate("contributor");
	topLikedContributions = topLikedContributions.map((each) => {
		let doc = each.toObject();
		delete doc.uploads;
		delete doc.dislike_count;
		delete doc.content;
		delete doc.submission_date;
		doc.event = doc.event ? doc.event.name : "Event not found";
		doc.contributor = doc.contributor
			? doc.contributor.full_name
			: "User not found";
		return doc;
	});
	return topLikedContributions;
}

async function getTopEvents() {
	let topEvents = await ContributionModel.aggregate([
		{ $group: { _id: "$event", count: { $sum: 1 } } },
		{ $sort: { count: -1 } },
		{ $limit: 3 },
		{
			$lookup: {
				from: "events",
				localField: "_id",
				foreignField: "_id",
				as: "event",
			},
		},
		{ $unwind: "$event" },
	]);
	topEvents = topEvents.map((each) => {
		let doc = each.event;
		delete doc.create_date;
		delete doc.due_date;
		delete doc.closure_date;
		delete doc.is_enable;
		delete doc.description;
		delete doc.create_by;
		doc.contribution_count = each.count;
		return doc;
	});
	return topEvents;
}

module.exports = router;
