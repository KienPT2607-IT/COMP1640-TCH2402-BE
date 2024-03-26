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
        required: [true, 'Ngày kết thúc sự kiện là bắt buộc.'],
        validate: {
            validator: function(value) {
                return value > this.create_date;
            },
            message: 'Ngày kết thúc sự kiện phải sau ngày tạo sự kiện.'
        }
    },
    closure_date: {
        type: Date,
        required: [true, 'Ngày đóng sự kiện là bắt buộc.'],
        validate: {
            validator: function(value) {
                return value > this.due_date;
            },
            message: 'Ngày đóng sự kiện phải sau ngày kết thúc sự kiện.'
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
