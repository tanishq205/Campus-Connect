const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  domain: [String],
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  registrationLink: String,
  image: String,
  organizer: {
    type: String,
    required: true
  },
  tags: [String],
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Event', eventSchema);

