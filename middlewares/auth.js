require("dotenv").config();

const jwt = require("jsonwebtoken");
const tokenSecret = process.env.TOKEN_SECRET_KEY;

const isAdmin = (req, res, next) => {
	try {
		const token = req.header("x-auth-token");
		if (!token) {
			return res.status(401).json({
				message: "No auth token, authorization denied!",
			});
		}
		const verified = jwt.verify(token, tokenSecret);
		if (!verified) {
			return res.status(401).json({
				message: "Token authorization failed, authorization denied!",
			});
		}
		if (verified.role !== "Admin") {
			return res.status(401).json({
				message: "You are not an admin, authorization denied!",
			});
		}
		// req._id = verified._id; // extract _id from token and assign to req._id
		// req.token = token;
		next();
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const isMktManager = (req, res, next) => {
	try {
		const token = req.header("x-auth-token");
		if (!token) {
			return res.status(401).json({
				message: "No auth token, authorization denied!",
			});
		}
		const verified = jwt.verify(token, tokenSecret);
		if (!verified) {
			return res.status(401).json({
				message: "Token authorization failed, authorization denied!",
			});
		}
		if (verified.role !== "Admin") {
			return res.status(401).json({
				message: "You are not an admin, authorization denied!",
			});
		}
		// req._id = verified._id; // extract _id from token and assign to req._id
		// req.token = token;
		next();
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const isCoorManager = (req, res, next) => {
	try {
		const token = req.header("x-auth-token");
		if (!token) {
			return res.status(401).json({
				message: "No auth token, authorization denied!",
			});
		}
		const verified = jwt.verify(token, tokenSecret);
		if (!verified) {
			return res.status(401).json({
				message: "Token authorization failed, authorization denied!",
			});
		}
		if (verified.role !== "Admin") {
			return res.status(401).json({
				message: "You are not an admin, authorization denied!",
			});
		}
		// req._id = verified._id; // extract _id from token and assign to req._id
		// req.token = token;
		next();
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const isStudent = (req, res, next) => {
	try {
		const token = req.header("x-auth-token");
		if (!token) {
			return res.status(401).json({
				message: "No auth token, authorization denied!",
			});
		}
		const verified = jwt.verify(token, tokenSecret);
		if (!verified) {
			return res.status(401).json({
				message: "Token authorization failed, authorization denied!",
			});
		}
		if (verified.role !== "Admin") {
			return res.status(401).json({
				message: "You are not an admin, authorization denied!",
			});
		}
		// req._id = verified._id; // extract _id from token and assign to req._id
		// req.token = token;
		next();
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

module.exports = {
	isAdmin,
};
