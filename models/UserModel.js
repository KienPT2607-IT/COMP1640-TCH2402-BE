const { Schema, SchemaTypes, model } = require("mongoose");

var UserSchema = Schema({
	full_name: String,
	email: {
		type: String,
		unique: true,
		required: true,
		validate: {
			validator: (v) => {
				return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
			},
			message: "Invalid email address",
		},
	},
	password: {
		type: String,
		required: true,
		minLength: [8, "Password must be at least 8 characters"],
		maxLength: [16, "Password cannot exceed 16 characters"],
		select: false,
	},
	dob: Date,
	phone_number: {
		type: String,
		unique: true,
		validate: {
			validator: (v) => {
				return /^0[0-9]{9}$/.test(v);
			},
			message: "Invalid phone number format",
		},
	},
	gender: Boolean,
	profile_picture: {
		type: String,
		validate: {
			validator: (v) => {
				return /.+\.(jpg|jpeg|png|gif)$/i.test(v);
			},
			message: "Invalid image file path",
		},
	},
	last_login: Date,
	registration_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	account_status: {
		type: Boolean,
		required: true,
		default: true,
	},
	faculty: {
		type: SchemaTypes.ObjectId,
		ref: "faculties",
	},
	created_by: {
		type: SchemaTypes.ObjectId,
		ref: "users",
	},
	role: {
		type: SchemaTypes.ObjectId,
		ref: "roles",
	},
});

var UserModel = model("users", UserSchema);
module.exports = UserModel;
