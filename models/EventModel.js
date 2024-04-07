const { Schema, SchemaTypes, model } = require("mongoose");

var EventSchema = Schema({
	name: {
		type: String,
		required: true,
	},
	create_date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	due_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > this.create_date;
            },
            message: 'The event end date must be after the event creation date.'
        }
    },
    closure_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > this.due_date;
            },
            message: 'The event close date must be after the event end date.'
        }
    },
	is_enable: {
		type: Boolean,
		require: true,
		default: true,
	},
	create_by: {
		type: SchemaTypes.ObjectId,
		ref: "users",
		required: true,
	},
	description: String,
});

var EventModel = model("events", EventSchema);
module.exports = EventModel;
