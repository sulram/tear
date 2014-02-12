/**
 * Utils
 */

var hash_regex = /#([a-zA-Z0-9À-úÇç_\-]*)/g;

// return unix time

function ut(d){
  return (new Date(d).getTime()/1000).toString();
}

// load moment lang

moment.lang('pt-br');

/**
 * Router
 */

var router = Router({
  '/': [openIndex],
  '/timelapse': [openTimelapse],
  '/adm': function(){
    $('body').addClass('admin');
  }
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
  var w = $win.width();
  var h = $win.height();
  $('#sidebar').height($win.height()-50);
  $('#posts_wrapper').height($win.height()-185);
});

$win.resize();

$('body').css({overflow:'hidden'});

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
  return false;
});

$('#post_body').bind('keydown',function(e){
  if(e.keyCode == 13 && (e.metaKey || e.ctrlKey)) {
    $('#add_post').submit();
  }
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
 * D3 VIS
 */

function findIndex(collection, param, value) {
    for (var i = 0; i < collection.length; i++) {
        if(collection[i][param] == value) return i;
    }
    return -1;
}

var nodes = [];
var links = [];

var gui, redraw, force, link, node, zoom, drag, vis, rect, wrapper;

var VIS = {

  constants: {
    linkDistance: 100,
    gravity: 0.1,
    charge: 300,
    fontSize: 1,
    strokeWeight: 1
  },

  init: function(){

    var w = $win.width()-400;
    var h = $win.height()-50;

    w = w < 960 ? 960 : w;
    h = h < 960 ? 960 : h;

    gui = new dat.GUI({
      autoPlace: false
    });

    gui.remember(this.constants);

    gui.add(this.constants, 'linkDistance', 0, 300)
      .onChange(function(value) {
        force.linkDistance(value);
        force.start();
      });
    gui.add(this.constants, 'gravity', 0, 1)
      .step(0.01)
      .onChange(function(value) {
        force.gravity(value);
        force.start();
      });
    gui.add(this.constants, 'charge', 0, 2000)
      .onChange(function(value) {
        force.charge(-value);
        force.start();
      });
    gui.add(this.constants, 'fontSize', 0.1, 20).onChange(this.tick);
    gui.add(this.constants, 'strokeWeight', 0.1, 5).onChange(this.tick);

    var customContainer = document.getElementById('gui');
    customContainer.appendChild(gui.domElement);

    zoom = d3.behavior.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", VIS.zoomed);

    drag = d3.behavior.drag()
      .origin(function(d) { return d; })
      .on("dragstart", VIS.dragstarted)
      .on("drag", VIS.dragged)
      .on("dragend", VIS.dragended);

    vis = d3.select("#vis").append("svg")
      .attr("width", w)
      .attr("height", h)
      .append('g').call(zoom);

    rect = vis.append('rect')
      .attr("class", "bg")
      .attr('width', w)
      .attr('height', h)
      .style("pointer-events", "all");

    wrapper = vis.append('g');

    node = wrapper.selectAll(".node");
    link = wrapper.selectAll(".link");

    _.each(_posts, function(post,i){
      VIS.nodes_to_add(post.body);
    });

    force = d3.layout.force()
      .size([$win.width()-400, $win.height()-50])
      .nodes(nodes)
      .links(links)
      .linkDistance(VIS.constants.linkDistance)
      .charge(VIS.constants.charge * -1)
      .gravity(VIS.constants.gravity)
      .friction(0.9)
      .on("tick", this.tick)
      .on('end', function() { force.alpha(0.01); console.log('restart tick'); });

    this.forcestart();
  },

  nodes_to_remove: function(text){
    var tags = text.match(hash_regex);
    if(tags && tags.length){
      for(var i=0; i < tags.length-1; i++){
        for(var j=i+1; j < tags.length; j++){
          VIS.link_process(tags[i],tags[j],true);
        }
      }
    }
    _.each(tags, function(tag,j){
      VIS.node_process(tag,true);
    });
    this.forcestart();
  },

  nodes_to_add: function(text, start){
    var tags = text.match(hash_regex);
    _.each(tags, function(tag,j){
      VIS.node_process(tag);
    });
    if(tags && tags.length){
      for(var i=0; i < tags.length-1; i++){
        for(var j=i+1; j < tags.length; j++){
          VIS.link_process(tags[i],tags[j]);
        }
      }
    }
    if(start) this.forcestart();
  },

  node_process: function(tag,remove){
    var node = findIndex(nodes, 'name', tag);
    if(remove){
      if(node !== -1){
        nodes[node].size--;
        if(nodes[node].size === 0){
          nodes.splice(node, 1);
        }
      }
    } else {
      if(node !== -1){
        nodes[node].size++;
      } else {
        nodes.push({name: tag, size: 1});
      }
    }
  },

  link_process: function(a,b,remove){
    var A = nodes[findIndex(nodes, 'name', a)];
    var B = nodes[findIndex(nodes, 'name', b)];
    var test1 = findIndex(links, 'name', a+"-"+b);
    var test2 = findIndex(links, 'name', b+"-"+a);
    var index =
      test1 != -1
        ? test1
        : test2 != -1
          ? test2
          : null;
    if(remove){
      if(index !== null){
        links[index].size--;
        if(links[index].size === 0){
          links.splice(index, 1);
        }
      }
    } else {
      if(index === null){
        links.push({name: a+"-"+b, source: A, target: B, size: 1});
      } else {
        links[index].size++;
      }
    }
  },

  forcestart: function() {

    link = link.data(force.links(), function(d) { return d.source.name + "-" + d.target.name; });

    link.enter().insert("line", ".node")
        .attr("class", "link")
        .attr("stroke-width", function(d){ return 1 + d.size; });

    link.exit().remove();

    node = node.data(force.nodes(), function(d) { return d.name; });

    var node_g = node.enter().insert("g")
        .attr("class", "node")
        .call(drag);

    node.exit().remove();

    node_g.append("svg:circle")
            .attr("class", "circle");

    node_g.append("svg:text")
            .attr("class", "text text-stroke")
            .attr("dy", ".3em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.name; });

    node_g.append("svg:text")
            .attr("class", "text")
            .attr("dy", ".3em")
            .attr("text-anchor", "middle")
            .text(function(d) { return d.name; });

    force.start();
  },

  tick: function () {

    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; })
        .attr("stroke-width", function(d){ return 1 + d.size * VIS.constants.strokeWeight; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    node.selectAll('.circle').attr("r", function(d) { return 10 + d.size; });
    node.selectAll('.text').attr("font-size", function(d) { return 12 + d.size * VIS.constants.fontSize; });

  },

  zoomed: function() {
    wrapper.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  },

  dragstarted: function(d) {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
  },

  dragged: function(d) {
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  },

  dragended: function(d) {
    d3.select(this).classed("dragging", false);
  }
};
