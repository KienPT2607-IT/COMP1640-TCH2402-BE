const fs = require("fs");
const path = require("path");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const { contributionBasePath } = require("../utilities/constants");
const multer = require("multer");

function createMulterStorage(desFolder) {
	return multer.diskStorage({
		destination: async (req, file, cb) => {
			const desPath = !req.body.event
				? path.join("./public/uploads", desFolder)
				: path.join(
						"./public/uploads",
						desFolder,
						req.body.event,
						req._id
				  );
			if (!fs.existsSync(desPath))
				fs.mkdirSync(desPath, { recursive: true });

			cb(null, desPath);
		},
		filename: (req, file, cb) => {
			let random = Math.floor(Math.random() * 1000000) + 1;
			let fileName =
				Date.now() + "_" + random + path.extname(file.originalname);
			req.fileName = fileName;
			cb(null, fileName);
		},
	});
}

function checkFileType(req, file, cb) {
	const filetypes = /jpeg|jpg|png|doc|docx/;
	const extname = filetypes.test(
		path.extname(file.originalname).toLowerCase()
	);
	const mimetype = filetypes.test(file.mimetype);

	if (mimetype && extname) {
		return cb(null, true);
	} else {
		cb(
			`Error: File upload only supports the following filetypes -${filetypes}`
		);
	}
}

async function clearDirectory(req, res, next) {
	console.log(req.body);
	const desPath = path.join(__dirname, "uploads");

	if (fs.existsSync(desPath)) {
		// Get the list of files in the destination folder
		const destinationFiles = await fs.promises.readdir(desPath);

		// Delete all files in the destination folder
		await Promise.all(
			destinationFiles.map((file) => unlink(path.join(desPath, file)))
		);
	} else {
		// Create the destination folder
		fs.mkdirSync(desPath, { recursive: true });
	}

	next();
}

function getUploadMiddleware(desFolder, field, maxCount = null) {
	const storage = createMulterStorage(desFolder);
	const upload = multer({
		storage: storage,
		limits: { fileSize: 1024 * 1024 * 5 },
		fileFilter: checkFileType,
	});
	return maxCount ? upload.array(field, maxCount) : upload.single(field);
}

module.exports = { getUploadMiddleware };
