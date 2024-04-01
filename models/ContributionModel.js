const { Schema, model, SchemaTypes } = require("mongoose");

var ContributionSchema = Schema({
	content: {
		type: String,
		required: true,
	},
	uploads: {
		type: [String],
		required: true,
	},
	like_count: {
		type: Number,
		min: 0,
		default: 0,
	},
	dislike_count: {
		type: Number,
		min: 0,
		default: 0,
	},
	submission_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	is_accepted: {
		required: true,
		type: Boolean,
		default: false,
	},
	contributor: {
		type: SchemaTypes.ObjectId,
		ref: "users",
		required: true,
	},
	event: {
		type: SchemaTypes.ObjectId,
		ref: "events",
		required: true,
	},
});

var ContributionModel = model("contributions", ContributionSchema);
module.exports = ContributionModel;
