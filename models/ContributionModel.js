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
	magazine: {
		type: SchemaTypes.ObjectId,
		ref: "magazines",
	},
});

var ContributionModel = model("contributions", ContributionSchema);
module.exports = ContributionModel;
