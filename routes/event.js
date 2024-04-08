require("dotenv").config();
const { isAuth } = require("../middlewares/auth");

var express = require("express");
var router = express.Router();
const EventModel = require("../models/EventModel");
const ContributionModel = require('../models/ContributionModel');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const { contributionBasePath } = require("../utilities/constants");
// * GET events listing.


router.get("/",isAuth(["Student", "Admin"]), async (req, res) => {
  try {
    const events = await EventModel.find().populate('create_by');
    if (events.length === 0) {
      return res.status(404).json({ message: "No events found" });
    }
    res.status(200).json({
      data: events
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// * POST create event.
router.post("/createEvent", isAuth(["Admin"]), async (req, res) => {
    try {
        // Tạo một instance mới của EventModel với toàn bộ thông tin từ req.body
        const event = new EventModel(req.body);

        // Gán create_by là _id từ token xác thực
        event.create_by = req._id;

        // Lưu sự kiện vào cơ sở dữ liệu
        await event.save();

        // Trả về kết quả thành công và sự kiện đã được tạo
        res.status(201).json(event);
    } catch (err) {
        // Xử lý lỗi nếu có
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
});

router.get("/detail/:id",isAuth(["Student", "Admin"]), async (req, res) => {
  try {
      const eventId = req.params.id;

      // Tìm kiếm sự kiện dựa trên ID
      const event = await EventModel.findById(eventId);
      if (!event) {
          return res.status(404).json({ message: "Sự kiện không tồn tại" });
      }

      // Tìm tất cả các đóng góp của sự kiện đó
      const contributions = await ContributionModel.find({ event: eventId });

      // Trả về thông tin chi tiết của sự kiện kèm theo tất cả các đóng góp của nó
      res.status(200).json({
          event: event,
          contributions: contributions
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server" });
  }
});

// * GET event by id.
router.get(
    "/updateEvent/:id", isAuth(["Admin"]),
    async (req, res) => {
      const event = await EventModel.findById(req.params.id);
      if (event) {
        res.send(event);
      } else {
        res.status(404).send({ message: "Event Not Found" });
      }
    }
  );
  
// * PUT update event.
router.put(
  "/updateEvent/:id",isAuth(["Admin"]),
  async (req, res) => {
    try {
      const id = req.params.id;
      const eventData = req.body; // Assuming the updated event data is sent in the request body
      const updatedEvent = await EventModel.findByIdAndUpdate(id, eventData, { new: true });
      res.send(updatedEvent);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error updating event");
    }
  }
);

router.delete(
    "/deleteEvent/:id",isAuth(["Admin"]),
    async (req, res) => {
      const event = await EventModel.findById(req.params.id);
      if (!event) return res.status(404).send("Event not found");
      await EventModel.remove(req.params.id);
      res.send(event);
    }
  );

  router.get("/download/:id",isAuth(["Admin"]), async (req, res) => {
    try {
      const docs = await ContributionModel.find({
        event: req.params.id,
      }).populate("event");
      if (!docs) {
        return res.status(404).json({
          message: "Contributions of this event not found!",
        });
      }
  
      const folderPath = `${contributionBasePath}/${req.params.id}`;
      // Create a zip file
      const zipPath = `./public/downloads/${docs[0].event.name}.zip`;
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });
      archive.pipe(output);
  
      // Add all files in the folder to the zip
      const contributionFolders = fs.readdirSync(folderPath);
      contributionFolders.forEach((folder) => {
        const files = fs.readdirSync(path.join(folderPath, folder));
        files.forEach((file) => {
          const filePath = path.join(folderPath, folder, file);
          archive.file(filePath, { name: path.join(folder, file) });
        });
      });
  
      // Finalize the zip file
      archive.finalize();
  
      // Send the zip file as a response
      output.on("close", () => {
        res.download(zipPath, (err) => {
          if (err) {
            res.status(500).json({ error: error.message });
          } else {
            // Delete the file after sending it
            fs.unlinkSync(zipPath);
          }
        });
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;
