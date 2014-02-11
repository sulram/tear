/** @jsx React.DOM */

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

// AJAX



// IO

io = io.connect();
io.emit('ready');
io.on('new visitor', function() {
  console.log('new visitor');
});

//

var _posts = [];

// React Components

var PostBox = React.createClass({
  getInitialState: function() {

    io.on('post_added', this.post_added);
    io.on('post_removed', this.post_removed);

    return {posts: []};

  },
  componentWillMount: function() {
    $.ajax({
      dataType: 'json',
      url: '/posts',
      method: 'POST',
      data: {pad: PAD},
      success: function( data ) {
        _posts = data.posts;
        this.setState({posts: _posts});
      }.bind(this)
    });
  },
  post_added: function(data){
    _posts.push(data.post);
    this.setState({posts: _posts});
  },
  post_removed: function(data){
    _posts = _.without(_posts, _.findWhere(_posts, {_id: data.post_id}));
    this.setState({posts: _posts});
  },
  deletePost: function(id){
    io.emit('remove_post',{
      post_id: id
    });
  },
  render: function() {
    return (
      <PostList posts={this.state.posts} handleDelete={this.deletePost}/>
    );
  }
});

var PostList = React.createClass({
  handleDelete: function(id){
    this.props.handleDelete(id);
    return false;
  },
  render: function() {
    var _this = this;
    var postNodes = _.sortBy(this.props.posts, function(a){return ut(a.createdAt) * -1;}).map(function (post,i) {
      return <Post id={post._id} clickDelete={_this.handleDelete.bind(_this, post._id)} body={post.body} date={post.createdAt}/>;
    });
    return (
      <div className="postList">
        {postNodes}
      </div>
    );
  }
});

var Post = React.createClass({
  render: function() {
    var date = moment(this.props.date).fromNow();
    return (
      <div id={this.props.id} className="post">
        <p>{this.props.body}</p>
        <p className="small">
          <small>
            {date}
          </small>
          <a href="#" onClick={this.props.clickDelete}><i className="fa fa-trash-o"></i></a>
          <a href="#" onClick={this.props.clickEdit}><i className="fa fa-pencil"></i></a>
        </p>
      </div>
    );
  }
});

React.renderComponent(
  <PostBox />,
  document.getElementById('posts')
);


function ut(d){
  return (new Date(d).getTime()/1000).toString();
}