const { Schema, SchemaTypes, model } = require("mongoose");

var FacultySchema = Schema({
	name: {
		type: String,
		unique: true,
		required: true,
	},
	status: {
		type: Boolean,
		required: true,
		default: true,
	},
});

var FacultyModel = model("faculties", FacultySchema);
module.exports = FacultyModel;
