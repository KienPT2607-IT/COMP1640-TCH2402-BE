require("dotenv").config();

var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");
const FacultyModel = require("../models/FacultyModel");
const RoleModel = require("../models/RoleModel");
const { getCurrentDate } = require("../utilities/date");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { isAuth } = require("../middlewares/auth");
const tokenSecret = process.env.TOKEN_SECRET_KEY;
const saltRounds = 8;
const nodemailer = require("nodemailer");
const { getUploadMiddleware } = require("../middlewares/upload");
const path = require("path");
const fs = require('fs');

// * GET users listing. ✅
/**
 * @swagger
 * /:
 *   get:
 *     summary: Retrieve a list of users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserArray'
 *       401:
 *         description: Authentication is required!/Token authorization failed, authorization denied!/Not authorized to perform this action, authorization denied!
 *       404:
 *         description: No users found
 *       500:
 *         description: Some server error
 */
router.get("/", isAuth(["Admin"]), async (req, res) => {
	try {
		let users = await UserModel.find().populate("faculty").populate("role");
		if (users.length <= 0) {
			res.status(400).json({
				message: "No users found!",
			});
		}

		let users_data = users.map((each) => {
			let user = each.toObject();
			if (user.faculty) user.faculty = user.faculty.name;
			if (user.profile_picture) {
				const imageUrl = path.join(
					process.env.HOST_URL,
					"public/profile_pictures",
					user.profile_picture
				);
				user.profile_picture = imageUrl;
			}
			user.role = user.role.name;
			return user;
		});
		res.status(200).json({
			data: users_data,
		});
	} catch (error) {
		res.status(404).json({
			error: error.message,
		});
	}
});

// * POST login. ✅
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password.
 *     responses:
 *       200:
 *         description: The user was successfully logged in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: User with this email does not exist!
 *       500:
 *         description: Some server error.
 */
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		let user = await UserModel.findOne({
			email: email,
		})
			.select("+password")
			.populate("faculty")
			.populate("role"); // "+" = allow select hidden field
		if (!user)
			return res.status(400).json({
				message: "User with this email does not exist!",
			});

		const isPassMatch = await bcrypt.compare(password, user.password);
		if (!isPassMatch)
			return res.status(400).json({
				message: "Incorrect password!",
			});

		user = user.toObject();
		if (user.faculty) user.faculty = user.faculty.name;
		if (user.profile_picture) {
			const imageUrl = path.join(
				process.env.HOST_URL,
				"public/profile_pictures",
				user.profile_picture
			);
			user.profile_picture = imageUrl;
		}

		user.role = user.role.name;
		const token = jwt.sign({ _id: user._id, role: user.role }, tokenSecret);
		delete user._id;
		res.status(200).json({
			token: token,
			data: user,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			error: error.message,
		});
	}
});

// * POST create user. ✅
/**
 * @swagger
 * /create-user:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-auth-token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token for authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               dob:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: boolean
 *               phone_number:
 *                 type: string
 *               faculty:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: The user was successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Faculty not found!/Role not found!
 *       500:
 *         description: Some server error.
 */
router.post("/create-user", isAuth(["Admin"]), async (req, res) => {
	try {
		const {
			full_name,
			email,
			password,
			dob,
			gender,
			phone_number,
			profile_picture,
			faculty,
			role,
		} = req.body;
		const _faculty = await FacultyModel.findOne({ name: faculty });
		if (!_faculty)
			return res.status(400).json({
				message: "Faculty not found!",
			});
		const _role = await RoleModel.findOne({ name: role });
		if (!_role)
			return res.status(400).json({
				message: "Role not found!",
			});
		console.log(saltRounds === 8);
		const hashedPass = await bcrypt.hash(password, saltRounds);
		await UserModel.create({
			full_name: full_name,
			email: email,
			password: hashedPass,
			dob: dob,
			phone_number: phone_number,
			gender: gender,
			profile_picture: profile_picture,
			registration_date: getCurrentDate(),
			faculty: _faculty._id,
			role: _role._id,
		});
		res.status(201).json({
			message: "Account added successfully!",
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(500).json({
			error: error.message,
		});
	}
});


// Route to serve user profile and avatar
router.get('/profile', isAuth(["Student", "Marketing Manager","Marketing Coordinator", "Guest","Admin"]), async (req, res) => {
    try {
        const userId = req._id; // Lấy userId từ thông tin được đặt vào req bởi middleware isAuth
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Lấy thông tin về ảnh đại diện của người dùng
        const profilePicture = user.profile_picture;
        // Đường dẫn đến thư mục chứa ảnh đại diện trên máy chủ
        const imagePath = path.join(__dirname, 'public/uploads/profile_pictures', profilePicture);

        // Kiểm tra xem tệp tin có tồn tại không
        // if (!fs.existsSync(imagePath)) {
        //     return res.status(404).json({ message: 'Profile picture not found' });
        // }
		const role = await RoleModel.findById(user.role);
        const faculty = await FacultyModel.findById(user.faculty);

        // Kết hợp thông tin người dùng và đường dẫn ảnh đại diện trong phản hồi JSON
        const userProfile = {
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
			role: role ? role.name : 'Unknown Role', // Sử dụng tên của vai trò nếu có, nếu không thì sử dụng giá trị mặc định 'Unknown Role'
            faculty: faculty ? faculty.name : 'Unknown Faculty', // Sử dụng tên của khoa nếu có, nếu không thì sử dụng giá trị mặc định 'Unknown Faculty'
			dob: user.dob,
            phone_number: user.phone_number,
			registration_date: user.registration_date,
			account_status: user.account_status,
            profile_picture: `https://comp1640-tch2402-be.onrender.com/public/uploads/profile_pictures/${profilePicture}`
            // Thêm các trường thông tin khác của người dùng nếu cần
        };
		console.log(userProfile);
        // Gửi phản hồi JSON chứa thông tin người dùng và đường dẫn ảnh đại diện
        res.status(200).json(userProfile);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



// // --------------------------Update Student info-------------------------
// router.get("/update", isAuth(["Student", "Marketing Manager","Marketing Coordinator", "Student","Admin"]), async (req, res) => {
//     try {
//         const userId = req._id; // Lấy userId từ thông tin được đặt vào req bởi middleware isAuth
// 		 const user = await UserModel.findById(userId);
// 		 // Lấy thông tin về ảnh đại diện của người dùng
// 		 const profilePicture = user.profile_picture;
// 		 // Đường dẫn đến thư mục chứa ảnh đại diện trên máy chủ
// 		 const imagePath = path.join(__dirname, 'public/uploads/profile_pictures', profilePicture);
 
// 		 // Kiểm tra xem tệp tin có tồn tại không
// 		//  if (!fs.existsSync(imagePath)) {
// 		// 	 res.status(404).json({ message: 'Profile picture not found' });
// 		//  }
//         const userProfile = {
//             _id: user._id,
//             full_name: user.full_name,
//             email: user.email,
// 			faculty: user.faculty,
// 			role:  user.role,
// 			dob: user.dob,
//             phone_number: user.phone_number,
//             profile_picture: `http://localhost:3000/uploads/profile_pictures/${profilePicture}`
//             // Thêm các trường thông tin khác của người dùng nếu cần
//         };
//         if (userProfile) {
//             res.send(userProfile);
//         } else {
//             res.status(404).send({ message: "User Not Found" });
//         }
//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });

router.put(
    "/update", isAuth(["Student", "Marketing Manager","Marketing Coordinator", "Guest","Admin"]),
    getUploadMiddleware("profile_pictures", "profile_picture"),
    async (req, res) => {
        try {
            const userId = req._id; // Lấy userId từ thông tin được đặt vào req bởi middleware isAuth
            const { password, phone_number } = req.body;
            const fileName = req.file.filename;

            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (password) {
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                user.password = hashedPassword;
            }

            if (phone_number) {
                user.phone_number = phone_number;
            }

            if (fileName) {
                user.profile_picture = fileName;
            }

            const updatedUser = await user.save();

            res.status(200).json({
                message: "User updated successfully",
                data: updatedUser,
            });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
);




//----------------------------Forgot-password------------------------------

// Phần cấu hình transporter
const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com", // Địa chỉ SMTP server
	port: 587, // Cổng SMTP
	secure: false, // Nếu sử dụng SSL/TLS, đặt giá trị là true
	auth: {
		user: "your email",
		pass: "pw app",
	},
});
// POST forgot password
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;

		// Check if the user exists in the database
		const user = await UserModel.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Generate a random password reset token
		const newPassword =
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15);

		const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
		// Save the new password to the user document
		user.password = hashedNewPassword;

		// Save the updated user document
		await user.save();

		// Send an email to the user with the new password
		await sendResetEmail(email, newPassword);

		res.status(200).json({ message: "Password reset email sent" });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
});
async function sendResetEmail(email, resetToken) {
	const mailOptions = {
		from: "your email",
		to: email,
		subject: "Password Reset",
		text: `The new password is: ${resetToken}`,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log("Email sent successfully");
	} catch (error) {
		console.error("Error sending email:", error);
	}
}

//--------------------------Delete account-------------------------
router.delete("/:id",isAuth(["Admin"]), async (req, res) => {
	try {
		const userId = req.params.id;

		// Delete the user from the database
		await UserModel.findByIdAndDelete(userId);

		res.status(200).json({ message: "Account deleted successfully" });
	} catch (error) {
		console.error("Error:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
});
module.exports = router;
