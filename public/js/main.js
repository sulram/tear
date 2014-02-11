/** @jsx React.DOM */


/**
 * Utils
 */

// return unix time

function ut(d){
  return (new Date(d).getTime()/1000).toString();
}

/**
 * Router
 */

var router = Router({
  '/': [openIndex],
  '/timelapse': [openTimelapse]
});

router.init('/');

function openIndex(){
  console.log('index');
}

function openTimelapse(){
  console.log('timelapse');
}

/**
 * Window
 */

var $win = $(window);

$win.resize(function(e){
  $('#sidebar').height($win.height()-50);
  $('#posts_wrapper').height($win.height()-196);
});

$win.resize();

/**
 * Submit post
 *
 * todo: move to a component
 */

$('#add_post').submit(function(e){
  io.emit('add_post',{
    pad: PAD,
    post_body: $('#post_body').val()
  });
  e.preventDefault();
});

/**
 * Sockets
 */

io = io.connect();

io.emit('ready');

io.on('new visitor', function() {
  console.log('new visitor');
});

/**
 * Data sets
 */

var _posts = [];

/**
 * React Components
 */

// PostBox: control posts flow

var PostBox = React.createClass({
  getInitialState: function() {
    io.on('post_added', this.post_added);
    io.on('post_removed', this.post_removed);
    io.on('post_updated', this.post_updated);
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
  post_updated: function(data){
    var index = _.indexOf(_posts, _.findWhere(_posts, {_id: data.post_id}));
    _posts[index].body = data.post_body;
    _posts[index].updatedAt = data.post_now;
    this.setState({posts: _posts});
    console.log(data.post_body);
  },
  deletePost: function(id){
    io.emit('remove_post',{
      post_id: id
    });
  },
  updatePost: function(id,body){
    io.emit('update_post',{
      post_id: id,
      post_body: body,
    });
  },
  render: function() {
    return (
      <PostList posts={this.state.posts} handleDelete={this.deletePost} handleUpdate={this.updatePost} />
    );
  }
});

// PostList: wrapper for list of posts

var PostList = React.createClass({
  handleDelete: function(id){
    this.props.handleDelete(id);
    return false;
  },
  handleEdit: function(id){
    this.props.handleDelete(id);
    return false;
  },
  render: function() {
    var _this = this;
    var postNodes = _.sortBy( this.props.posts, function(a){
        return ut(a.createdAt) * -1;
      }).map(function (post,i) {
        return <Post id={post._id} handleUpdate={_this.props.handleUpdate} clickDelete={_this.handleDelete.bind(_this, post._id)} body={post.body} date={post.updatedAt}/>;
      });
    return (
      <div className="postList">
        {postNodes}
      </div>
    );
  }
});

// Post: component with 2 states: edit and show

var Post = React.createClass({
  getInitialState: function() {
    return {
      editmode: false
    };
  },
  handleEdit: function(){
    this.setState({editmode: true});
  },
  handleUpdate: function(id, body){
    this.setState({editmode: false});
    this.props.handleUpdate(id, body);
  },
  render: function() {
    var child = this.state.editmode
      ? <PostInnerEdit id={this.props.id} body={this.props.body} handleUpdate={this.handleUpdate} />
      : <PostInnerShow id={this.props.id} body={this.props.body} date={this.props.date} clickEdit={this.handleEdit} clickDelete={this.props.clickDelete} />;
    return child;
  }
});

// PostInnerEdit: editmode = true

var PostInnerEdit = React.createClass({
  handleSubmit: function(){
    var body = this.refs.body.getDOMNode().value.trim();
    this.props.handleUpdate(this.props.id, body);
    return false;
  },
  render: function() {
    return (
      <div id={this.props.id} className="post">
        <form className="editForm" onSubmit={this.handleSubmit}>
          <textarea ref="body">{this.props.body}</textarea>
          <input type='submit' />
        </form>
      </div>
    );
  }
});

// PostInnerShow: editmode = false

var PostInnerShow = React.createClass({
  getInitialState: function() {
    return {fromnow: null};
  },
  tick: function() {
    this.setState({fromnow: moment(this.props.date).fromNow()});
  },
  componentDidMount: function() {
    this.interval = setInterval(this.tick, 1000);
    this.tick();
  },
  componentWillUnmount: function() {
    clearInterval(this.interval);
  },
  render: function() {
    var date = moment(this.props.date).fromNow();
    return (
      <div id={this.props.id} className="post">
        <p>{this.props.body}</p>
        <p className="small">
          <small>
            {this.state.fromnow}
          </small>
          <a href="#" onClick={this.props.clickDelete}><i className="fa fa-trash-o"></i></a>
          <a href="#" onClick={this.props.clickEdit}><i className="fa fa-pencil"></i></a>
        </p>
      </div>
    );
  }
});

/**
 * Init App
 */

React.renderComponent(
  <PostBox />,
  document.getElementById('posts')
);