var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var PadSchema = new Schema({
  slug: {
    type: String,
    index: {
      unique: true
    }
  },
  createdAt: Date,
  updatedAt: Date
});

PadSchema.pre('save', function(next) {
  if(this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

mongoose.model('Pad', PadSchema);