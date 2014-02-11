var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var PostSchema = new Schema({
  body: String,
  pad: {type:ObjectId, ref:'Pad'},
  createdAt: Date,
  updatedAt: Date
});

PostSchema.pre('save', function(next) {
  if(this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

mongoose.model('Post', PostSchema);