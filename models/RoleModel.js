const { Schema, model } = require("mongoose");

var RoleSchema = Schema({
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

var RoleModel = model("roles", RoleSchema);
module.exports = RoleModel;
