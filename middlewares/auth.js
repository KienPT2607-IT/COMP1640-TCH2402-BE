require("dotenv").config();

const jwt = require("jsonwebtoken");
const tokenSecret = process.env.TOKEN_SECRET_KEY;

const isAuth = (allowedRoles) => (req, res, next) => {
	try {
		const token = req.header("x-auth-token");
		if (!token)
			return res.status(401).json({
				message: "No auth token, authorization denied!",
			});

		const verified = jwt.verify(token, tokenSecret);
		if (!verified)
			return res.status(401).json({
				message: "Token authorization failed, authorization denied!",
			});
		if (!allowedRoles.includes(verified.role))
			return res.status(401).json({
				message:
					"Not authorized to perform this action, authorization denied!",
			});

		req._id = verified._id; // extract _id from token and assign to req._id
		req.role = verified.role; // extract role from token and assign to req.role
		next();
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

module.exports = {
	isAuth,
};
