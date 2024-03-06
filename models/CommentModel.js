const { Schema, model, SchemaTypes } = require("mongoose");

var CommentSchema = Schema({
	content: {
		type: String,
		required: true,
	},
	commenter: {
		type: SchemaTypes.ObjectId,
		ref: "users",
		required: true,
	},
	like_count: {
		type: Number,
		min: 0,
	},
	dislike_count: {
		type: Number,
		min: 0,
	},
	contribution: {
		type: SchemaTypes.ObjectId,
		ref: "contributions",
		required: true,
	},
	created_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	status: {
		type: Boolean,
		required: true,
		default: true,
	},
});

var CommentModel = model("comments", CommentSchema);
module.exports = CommentModel;
