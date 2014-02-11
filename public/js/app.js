var routes = {
  '/': [openIndex],
  '/timelapse': [openTimelapse]
};
var router = Router(routes);
router.init('/');

function openIndex(){
  console.log('index');
}

function openTimelapse(){
  console.log('timelapse');
}


// Window resize

var $win = $(window);

$win.resize(function(e){
  $('#sidebar').height($win.height()-50);
});

$win.resize();

// Form

$('#add_post').submit(function(e){
	io.emit('add_post',{
		pad: PAD,
		post_body: $('#post_body').val()
	});
	e.preventDefault();
});

// IO

io = io.connect();
io.emit('ready');
io.on('new visitor', function() {
	console.log('new visitor');
});
io.on('post_added', function(data) {
	console.log('received:', data);
});
