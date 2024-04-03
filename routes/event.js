require("dotenv").config();
const { isAuth } = require("../middlewares/auth");

var express = require("express");
var router = express.Router();
const EventModel = require("../models/EventModel");

// * GET events listing.
const EventModel = require('./path/to/your/EventModel');

router.get("/", isAuth(["Admin"]), async (req, res) => {
  try {
    const events = await EventModel.find({});
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

router.get("/", isAuth(["Student"]))

module.exports = router;
