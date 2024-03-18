const { Schema, model, SchemaTypes } = require("mongoose");

var ContributionSchema = Schema({
	title: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		unique: true,
	},
	image: {
		type: String,
		unique: true,
	},
	like_count: {
		type: Number,
		min: 0
	},
	dislike_count: {
		type: Number,
		min: 0
	},
	submission_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	last_update: {
		type: Date,
		required: true,
		default: Date.now,
	},
	event: {
		type: SchemaTypes.ObjectId,
		ref: "events",
	},
});

var ContributionModel = model("contributions", ContributionSchema);
module.exports = ContributionModel;
