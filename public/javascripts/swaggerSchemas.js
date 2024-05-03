module.exports = {
	User: {
		type: "object",
		properties: {
			full_name: { type: "string" },
			email: { type: "string", format: "email" },
			password: { type: "string", format: "password" },
			dob: { type: "string", format: "date" },
			phone_number: { type: "string" },
			gender: { type: "boolean" },
			profile_picture: { type: "string" },
			registration_date: { type: "string", format: "date" },
			account_status: { type: "boolean" },
			faculty: { type: "string" },
			role: { type: "string" },
		},
	},
	UserArray: {
		type: "object",
		properties: {
			data: {
				type: "array",
				items: {
					$ref: "#/components/schemas/User",
				},
			},
		},
	},
	LoginResponse: {
		type: "object",
		properties: {
			token: { type: "string" },
			data: { $ref: "#/components/schemas/User" },
		},
	},
	Contribution: {
		type: "object",
		properties: {
			document_des_path: { type: "string" },
			like_count: { type: "integer", minimum: 0 },
			dislike_count: { type: "integer", minimum: 0 },
			submission_date: { type: "string", format: "date-time" },
			is_accepted: { type: "boolean" },
			contributor: { type: "string", format: "uuid" },
			event: { type: "string", format: "uuid" },
		},
		required: [
			"document_des_path",
			"submission_date",
			"is_accepted",
			"contributor",
			"event",
		],
	},
	ContributionArray: {
		type: "object",
		properties: {
			data: {
				type: "array",
				items: {
					$ref: "#/components/schemas/Contribution",
				},
			},
		},
	},
};
