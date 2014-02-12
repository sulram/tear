
/**
 * Module dependencies.
 */

var express = require('express.io')
  , fs = require('fs')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , config = require('./config')
  , env = process.env;

console.log(env.MONGODB_USERNAME,env.MONGODB_PASSWORD,env.MONGODB_PORT,env.MONGO_URL,env.MONGODB_DATABASE);
mongoose.connect('mongodb://'+env.MONGODB_USERNAME+':'+env.MONGODB_PASSWORD+'@'+env.MONGO_URL+':'+env.MONGODB_PORT+'/'+env.MONGODB_DATABASE);

var app = express();

app.http().io();

app.configure(function(){
  app.set('port', process.env.PORT || 5000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

/**
 * Helpers
 */

app.locals.slugify = function(str) {
  str = str.toLowerCase();
  str = str.replace(/[àáâãä]/ig, 'a');
  str = str.replace(/[éêë]/ig, 'e');
  str = str.replace(/[íï]/ig, 'i');
  str = str.replace(/[óôõö]/ig, 'o');
  str = str.replace(/[úü]/ig, 'u');
  str = str.replace(/ç/ig, 'c');
  str = str.replace(/ñ/ig, 'n');
  str = str.replace(/[^-a-zA-Z0-9,&\s]+/ig, '');
  str = str.replace(/-/ig, '_');
  str = str.replace(/\s/ig, '-');
  return str;
};

/**
 * Schemas
 */

// scan models dir and load each file

var models_path = __dirname + '/models';
fs.readdirSync(models_path).forEach(function(file) {
  require(models_path+'/'+file);
});

// load models

var Pad = mongoose.model('Pad');
var Post = mongoose.model('Post');

/**
 * Routes
 */

// home, create new pad

app.get('/', function(req, res, next){
  res.render('index', {title: 'home'});
});

// list all pads

app.get('/pads', function(req, res, next){
  Pad.find(function (err, pads) {
    res.render('pads', {title: 'lista', pads: pads});
  });
});

// forbid accesse pad from browser

app.get('/pad', function(req, res, next){
  res.redirect('/');
});

// create pad or redirect to pad with slug

app.post('/pad', function(req, res, next){
  if(req.body.slug.trim() === ''){
    return res.redirect('/');
  }
  var slug = app.locals.slugify(req.body.slug);
  Pad.findOne({ 'slug': slug }, function (err, pad) {
    if (err) return next(err);
    if(!pad){
      pad = new Pad({slug: slug});
      pad.save(function(err) {
        if(err) return next(err);
        console.log('pad save redir', this);
        res.redirect('/pad/'+slug+'/');  
      });
    } else {
      res.redirect('/pad/'+slug+'/');
    }
  });
});

// open pad with slug

app.get('/pad/:slug', function(req, res, next){
  Pad
    .findOne({slug: req.params.slug})
    .exec(function (err, pad) {
      if(err) return next(err);
      if(!pad){
        res.render('pad', { title: 'pad não existe' });
      } else {
        console.log(pad);
        res.render('pad', { title: req.params.slug, pad: pad });
      }
    });
  
});

// posts

app.post('/posts', function(req, res, next){
  Post
    .find({pad: req.body.pad})
    .exec(function (err, posts) {
      if(err) return next(err);
      res.json({posts: posts});
    });
});

/**
 * Sockets
 */

app.io.route('ready', function(req, res, next) {
  app.io.broadcast('new visitor');
});

app.io.route('add_post', function(req, res, next) {
    if(req.data.pad && req.data.post_body.trim() !== ''){
      var post = new Post({
        body: req.data.post_body,
        pad: mongoose.Types.ObjectId(req.data.pad)
      });
      post.save(function(err) {
        if(err) return next(err);
        app.io.broadcast('post_added',{
          post: post
        });
      });
    }
});

app.io.route('remove_post', function(req, res, next) {
    if(req.data.post_id){
      Post.remove({_id: req.data.post_id},function(err) {
        if(err) return next(err);
        app.io.broadcast('post_removed',{
          post_id: req.data.post_id
        });
      });
    }
});

app.io.route('update_post', function(req, res, next) {
    if(req.data.post_id){
      Post.findOne({_id: req.data.post_id}, function(err, post) {
        if(err) return next(err);
        if(post.body !== req.data.post_body){
          post.body = req.data.post_body;
          post.save();
          app.io.broadcast('post_updated',{
            post_id: req.data.post_id,
            post_body: req.data.post_body,
            post_now: new Date()
          });
        }
      });
    }
});

/**
 * Server
 */

app.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
