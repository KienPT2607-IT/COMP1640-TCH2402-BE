var express = require("express");
var router = express.Router();
const UserModel = require("../models/UserModel");
const EventModel = require("../models/EventModel");


// * GET events listing.
router.get("/", async (req, res) => {
    try {
        const events = await EventModel.find({});
        res.send(events);
    } catch (error) {
        console.log("Found an error:" + error);
        res.status(404).json({
            error: error.message,
        });
    }
});

router.post(
    "/createEvent",
    async (req, res) => {
      const newEvent = new EventModel({
        name: req.body.name,
        create_data: req.body.create_date,
        due_date: req.body.due_date,
        description: req.body.description,
        closure_date: req.body.closure_date,
        is_enable: req.body.is_enable,
        last_update: req.body.last_update,
        user: req.userData._id
      });
      const event = await newEvent.save();
      res.send({
        _id: event._id,
        name: event.name,
        create_date: event.create_date,
        due_date: event.due_date,
        description: event.description,
        closure_date: event.closure_date,
        is_enable: event.is_enable,
        last_update: event.last_update,
        user: event.user
      });
    }
  );

router.get("edit/:id", async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id);
        if (event) {
            res.send(event);
        } else {
            res.status(404).send({ message: "Event Not Found" });
        }
    } catch (error) {
        console.log("Found an error:" + error);
        res.status(404).json({
            error: error.message,
        });
    }
});

router.put("edit/:id", async (req, res) => {
    const event = await EventModel.findById(req.params.id);
    if (event) {
        event.name = req.body.name;
        event.create_date = req.body.create_date;
        event.due_date = req.body.due_date;
        event.description = req.body.description;
        event.closure_date = req.body.closure_date;
        event.is_enable = req.body.is_enable;
        event.last_update = req.body.last_update;
        
        const updatedEvent = await event.save();
        res.send({
            _id: updatedEvent._id,
            name: updatedEvent.name,
            create_date: updatedEvent.create_date,
            due_date: updatedEvent.due_date,
            description: updatedEvent.description,
            closure_date: updatedEvent.closure_date,
            is_enable: updatedEvent.is_enable,
            last_update: updatedEvent.last_update,
        });
    } else {
        res.status(404).send({ message: "Event Not Found" });
    }
});

// Delete a Event by its ID
router.delete("/:id", auth, async (req, res) => {
    try {
        const event = await EventModel.findById(req.params.id);
        if (!event) return res.status(404).send("Event not found");

        // Check user permission
        if (String(req.user._id) !== String(event.user))
            return res.status(403).send("Access denied");

        await EventModel.remove(req.params.id);
        res.send({ message: `Deleted event ${event.name}` });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


module.exports = router;
