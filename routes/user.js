var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");
const FacultyModel = require("../models/FacultyModel");
const RoleModel = require("../models/RoleModel");
const { getCurrentDate } = require("../utilities/date");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { tokenSecret, saltRounds } = require("../utilities/constants");
const { isAdmin } = require("../middlewares/auth");
const nodemailer = require('nodemailer');


// * GET users listing.
router.get("/", async (req, res) => {
	try {
		let users = await UserModel.find();
		console.log(users.length);

		res.status(200).json({
			data: users,
		});
	} catch (error) {
		console.log("Found an error:" + error);
		res.status(404).json({
			error: error.message,
		});
	}
});

router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		let user = await UserModel.findOne({
			email: email,
		})
			.select("+password")
			.populate("faculty")
			.populate("role"); // "+" = allow select hidden field
		if (!user) {
			return res.status(400).json({
				message: "User with this email does not exist!",
			});
		}

		const isPassMatch = await bcrypt.compare(password, user.password);
		if (!isPassMatch) {
			return res.status(400).json({
				message: "Incorrect password!",
			});
		}
		const token = jwt.sign(
			{ _id: user._id, role: user.role.name },
			tokenSecret
		);
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

router.post("/register", isAdmin, async (req, res) => {
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

router.get(
	'/:id',
	async (req, res) => {
	  const user = await UserModel.findById(req.params.id);
	  if (user) {
		res.send(user);
	  } else {
		res.status(404).send({ message: 'User Not Found' });
	  }
	}
  );

  router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {email, password, phone_number, profile_picture } = req.body;

        // Kiểm tra xem người dùng có tồn tại trong cơ sở dữ liệu không
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

		if (email) {
            user.email = email;
        }
        // Nếu có trường password được cung cấp, mã hóa mật khẩu mới và cập nhật vào user
        if (password) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            user.password = hashedPassword;
        }

        // Cập nhật phone number nếu được cung cấp
        if (phone_number) {
            user.phone_number = phone_number;
        }

        // Cập nhật profile picture nếu được cung cấp
        if (profile_picture) {
            user.profile_picture = profile_picture;
        }

        // Lưu thông tin người dùng đã cập nhật vào cơ sở dữ liệu
        const updatedUser = await user.save();

        // Trả về phản hồi thành công với thông tin người dùng đã cập nhật
        res.status(200).json({ message: "User updated successfully", data: updatedUser });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


  // Phần cấu hình transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Địa chỉ SMTP server của bạn
    port: 587, // Cổng SMTP
    secure: false, // Nếu sử dụng SSL/TLS, đặt giá trị là true
    auth: {
        user: 'chiendvgch200793@fpt.edu.vn', 
        pass: 'deas fhzw dvab jjur'  
    }
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
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Save the reset token and its expiration date to the user document
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    // Save the updated user document
    await user.save();

    // Send the password reset email to the user's email address
    // You can use a library like Nodemailer to send the email
	 // Send an email to the user with the new password
	 await sendResetEmail(email, resetToken);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
async function sendResetEmail(email, resetToken) {
    const mailOptions = {
        from: 'chiendvgch200793@fpt.edu.vn',
        to: email,
        subject: 'Password Reset',
        text: `The new password is: ${resetToken}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = router;
