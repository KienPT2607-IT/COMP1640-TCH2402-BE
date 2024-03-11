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
        const { password, phone_number, profile_picture } = req.body;

        // Kiểm tra xem người dùng có tồn tại trong cơ sở dữ liệu không
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
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



//  //update student
//  router.put(
// 	'/:id',
// 	async (req, res) => {
// 	  const user = await UserModel.findById(req.params.id);
// 	  if (user) {
// 		user.full_name = req.body.full_name || user.full_name;
// 		user.email = req.body.email || user.email;
// 		user.phone_number = req.body.phone_number || user.phone_number;
// 		user.profile_picture = req.body.profile_picture || user.profile_picture;
// 		const updatedUser = await user.save();
// 		res.send({ message: 'User Updated', user: updatedUser });
// 	  } else {
// 		res.status(404).send({ message: 'User Not Found' });
// 	  }
// 	}
//   );


  
module.exports = router;
