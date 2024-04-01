const fs = require("fs");
const path = require("path");
const util = require("util");
const unlink = util.promisify(fs.unlink);
const { contributionBasePath } = require("../utilities/constants");
const multer = require("multer");

async function removeFiles(filePaths, dirPath) {
	
	for (const filePath of filePaths) {
		try {
			const pathToFile = `${contributionBasePath}/${dirPath}/${filePath}`;
			await unlink(`${contributionBasePath}/${dirPath}/${filePath}`);
		} catch (error) {}
	}
}

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
			if (!req._files) {
				req._files = [];
			}
			req._files.push(fileName);
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

function getUploadMiddleware(desFolder, field, maxCount = null) {
	const storage = createMulterStorage(desFolder);
	const upload = multer({
		storage: storage,
		limits: { fileSize: 1024 * 1024 * 5 },
		fileFilter: checkFileType,
	});
	return maxCount ? upload.array(field, maxCount) : upload.single(field);
}

module.exports = { getUploadMiddleware, removeFiles };
