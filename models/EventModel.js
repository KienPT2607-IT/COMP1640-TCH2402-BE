const { Schema, SchemaTypes, model } = require("mongoose");

var EventSchema = Schema({
	name: {
		type: String,
		required: true,
	},
	create_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	due_date: {
		type: Date,
		required: true,
	},
	closure_date: {
		type: Date,
		required: true,
	},
	is_enable: {
		type: Boolean,
		require: true,
		default: true,
	},
	last_update: {
		type: Date,
		require: true,
		default: Date.now,
	},
	create_by: {
		type: SchemaTypes.ObjectId,
		ref: "users",
		required: true,
	},
	description: String,
});

var EventModel = model("events", EventSchema);
module.exports = EventModel;
