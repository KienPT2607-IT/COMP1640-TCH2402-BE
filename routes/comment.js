const express = require("express");
const router = express.Router();
const CommentModel = require("../models/CommentModel");
const ContributionModel = require("../models/ContributionModel");
const { isAuth } = require("../middleware/auth");

// Create a new comment
router.post("/", isAuth(["user"]), async (req, res) => {
  try {
    const { content, contribution } = req.body;

    // Lấy _id của commenter từ req._id
    const commenter = req._id;

    // Kiểm tra xem contribution có tồn tại không
    const contributionExists = await ContributionModel.findById(contribution);
    if (!contributionExists) {
      return res.status(404).json({ message: "Contribution not found" });
    }

    const newComment = new CommentModel({
      content,
      commenter,
      contribution,
    });

    const savedComment = await newComment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Hiển thị tất cả các comment cho mỗi contribution
router.get("/:contributionId", async (req, res) => {
    try {
      const { contributionId } = req.params;
  
      // Kiểm tra xem contribution có tồn tại không
      const contributionExists = await ContributionModel.findById(contributionId);
      if (!contributionExists) {
        return res.status(404).json({ message: "Contribution not found" });
      }
  
      // Lấy tất cả các comment cho contributionId được cung cấp
      const comments = await CommentModel.find({ contribution: contributionId })
        .populate("commenter", "username email") // Lấy thông tin commenter từ UserModel
        .exec();
  
      res.status(200).json(comments);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Route để người dùng like một comment
router.put('/comment/:commentId/like', isAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
  
      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
  
      comment.like_count += 1;
      await comment.save();
  
      res.status(200).json({ message: 'Comment liked successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  // Route để người dùng dislike một comment
  router.put('/comment/:commentId/dislike', isAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
  
      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
  
      comment.dislike_count += 1;
      await comment.save();
  
      res.status(200).json({ message: 'Comment disliked successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


module.exports = router;
