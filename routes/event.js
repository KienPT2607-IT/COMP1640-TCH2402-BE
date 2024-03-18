var express = require("express");
var router = express.Router();
const EventModel = require("../models/EventModel");

// * GET events listing.
router.get(
    "/",
    async (req, res) => {
      const events = await EventModel.find({});
      res.send(events);
    }
  );

// * POST create event.
router.post(
  "/createEvent",
  async (req, res) => {
    try {
      const eventData = req.body; // Assuming the event data is sent in the request body
      const event = await EventModel.create(eventData);
      res.status(201).send(event);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error creating event");
    }
  }
);
// * GET event by id.
router.get(
    "/updateEvent/:id",
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
  "/updateEvent/:id",
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
    "/deleteEvent/:id",
    async (req, res) => {
      const event = await EventModel.findById(req.params.id);
      if (!event) return res.status(404).send("Event not found");
      await EventModel.remove(req.params.id);
      res.send(event);
    }
  );

module.exports = router;
