/** @jsx React.DOM */

function SetCaretAtEnd(elem) {
  var elemLen = elem.value.length;
  // For IE Only
  if (document.selection) {
    // Set focus
    elem.focus();
    // Use IE Ranges
    var oSel = document.selection.createRange();
    // Reset position to 0 & then set at end
    oSel.moveStart('character', -elemLen);
    oSel.moveStart('character', elemLen);
    oSel.moveEnd('character', 0);
    oSel.select();
  }
  else if (elem.selectionStart || elem.selectionStart == '0') {
    // Firefox/Chrome
    elem.selectionStart = elemLen;
    elem.selectionEnd = elemLen;
    elem.focus();
  } // if
}

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
        VIS.init();
      }.bind(this)
    });
  },
  post_added: function(data){
    _posts.push(data.post);
    this.setState({posts: _posts});
    VIS.nodes_to_add(data.post.body,true);
    $('#post_body').val('');
  },
  post_removed: function(data){
    var old_post = _.findWhere(_posts, {_id: data.post_id});
    VIS.nodes_to_remove(old_post.body);
    _posts = _.without(_posts, old_post);
    this.setState({posts: _posts});
  },
  post_updated: function(data){
    var old_post = _.findWhere(_posts, {_id: data.post_id});
    var index = _.indexOf(_posts, old_post);
    VIS.nodes_to_remove(old_post.body);
    VIS.nodes_to_add(data.post_body,true);
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
  componentDidMount: function() {
    $('#post_body').bind('focus', this.handleFocusNewPost);
  },
  componentWillUnmount: function() {
    $('#post_body').unbind('focus', this.handleFocusNewPost);
  },
  handleFocusNewPost: function(){
    this.setState({editmode: false});
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
  componentDidMount: function() {
    var textarea = $('#'+this.props.id+' textarea');
    var _this = this;
    SetCaretAtEnd(textarea.focus().get(0));
    textarea.bind('keydown', function(e){
      if(e.keyCode == 13 && (e.metaKey || e.ctrlKey)) {
        _this.handleSubmit();
      }
    });
  },
  componentWillUnmount: function() {
    var textarea = $('#'+this.props.id+' textarea');
    textarea.unbind();
  },
  handleSubmit: function(){
    var body = this.refs.body.getDOMNode().value.trim();
    this.props.handleUpdate(this.props.id, body);
    return false;
  },
  render: function() {
    return (
      <div id={this.props.id} className="post">
        <form onSubmit={this.handleSubmit} className="form-square">
          <textarea ref="body" rows="3" className="form-control">{this.props.body}</textarea>
          <input type="submit" className="btn btn-default btn-block" value="atualizar" />
        </form>
      </div>
    );
  }
});

// PostInnerShow: editmode = false

var PostInnerShow = React.createClass({
  render: function() {
    var body = this.props.body.split('\n').map(function(val,i){
      return <PostLine text={val} />;
    });
    return (
      <div id={this.props.id} className="post">
        <p className="body">{body}</p>
        <p className="small">
          <small>
            <FromNow date={this.props.date}/>
          </small>
          <span className="control btnDelete"><a href="#" onClick={this.props.clickDelete}><i className="fa fa-trash-o"></i></a></span>
          <span className="control btnEdit"><a href="#" onClick={this.props.clickEdit}><i className="fa fa-pencil"></i></a></span>
        </p>
      </div>
    );
  }
});

var PostLine = React.createClass({
  render: function(){
    var tokens = this.props.text.split(hash_regex);
    for (var i = 1; i < tokens.length; i += 2) {
      tokens[i] = <span className="hashtag">{'#'+tokens[i]}</span>;
    }
    return <span className="line">{tokens}</span>;
  }
});

var FromNow = React.createClass({
  getInitialState: function() {
    return {moment: null};
  },
  tick: function() {
    this.setState({moment: moment(this.props.date).fromNow()});
  },
  componentDidMount: function() {
    this.interval = setInterval(this.tick, 1000);
    this.tick();
  },
  componentWillUnmount: function() {
    clearInterval(this.interval);
  },
  render: function(){
    return (
      <span>{this.state.moment}</span>
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
