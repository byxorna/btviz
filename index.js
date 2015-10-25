//---- models+collections
var Target = Backbone.Model.extend({
  idAttribute: "name",
  url: function(attrs){ return "/v1/target/" + attrs.name; }
});
var SeedStatus = Backbone.Model.extend({
  idAttribute: "id"
});

var TargetCollection = Backbone.Collection.extend({
  model: Target,
  url: "/v1/targets"
});
var SeedStatusCollection = Backbone.Collection.extend({
  model: SeedStatus,
});

//---- views
var TargetStatusView = Backbone.View.extend({
  template: _.template($('#target-status-template').html()),
  initialize:function(){ this.render() ; this.model.on("change",this.render,this); },
  render: function(){
    this.$el.html(this.template(this.model.attributes));
    return this;
  }
});

var SeedingStatusView = Backbone.View.extend({
  template: _.template($('#seeding-status-template').html()),
  initialize: function(){
    var elem = this.el;
    this.$el.empty();
    this.$el.append('<div class="swarm-status h1 text-uppercase">swarm status</div>');
    this.swarmStatusProgressTemplate = _.template($('#seeding-status-swarm-template').html());
    this.$el.append(this.swarmStatusProgressTemplate({progress: 0}));
    console.log("this is the swarm status",this.$el.find('.swarm-status'));
    this.swarmStatusEl = this.$el.find('.swarm-status');
    this.swarmStatusProgressEl = this.$el.find('.progress-bar');
    var margin = { top: 50, right: 0, bottom: 100, left: 30 },
        width = 960 - margin.left - margin.right,
        height = 800 - margin.top - margin.bottom;
    //this.defaultColor = "#2b3e50";  // background
    this.defaultColor = "#4e5d6c";
    //this.colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]; // alternatively colorbrewer.YlGnBu[9]
    //this.colors = [ "#fff7f3", "#fde0dd", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177", "#49006a" ]; // shades of magenta
    //this.colors = ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#006837", "#004529"];  // shades of green
    //this.colors = ["#d9534f","#df691a","#f0ad4e","#5bc0de","#5cb85c"];
    this.colors = [
      "rgb(165, 0, 38)",
      "rgb(215, 48, 39)",
      "rgb(244, 109, 67)",
      "rgb(253, 174, 97)",
      "rgb(254, 224, 139)",
      "rgb(255, 255, 191)",
      "rgb(217, 239, 139)",
      "rgb(166, 217, 106)",
      "rgb(102, 189, 99)",
      "rgb(26, 152, 80)",
      "rgb(0, 104, 55)"
    ];  // RdYlGn 
    this.xbuckets = 50;
    this.gridSize = Math.floor(width / this.xbuckets); // how wide we want our display to be
    this.colorScale = d3.scale.quantile()
        .domain([0, this.colors.length-1, 100])
        .range(this.colors);

    this.svg = d3.select(elem).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    this.render();
    // debounced render doesnt reliably get called :/
    // I dont understand how this debounce works!!!! its performant as fuck if you pass a 0 delay, but >0 makes it shitty
    this.model.on("change:downloaded add", _.debounce(_.bind(this.render,this), 0), this);
    //this.model.on("change:downloaded", this.render, this);
  },
  render: function(){
    var tnow = new Date();
    console.log("render called",tnow);
    var data = this.model;
    var swarmsize = data.length,
        ncompleted = data.reject(function(x){return x.get('downloaded')<100;}).length,
        pct = ncompleted/swarmsize;
    var view = this;
    view.swarmStatusEl.text("" + ncompleted + " seeders, " + swarmsize + " in swarm. " + Math.floor(pct*100) + "% complete in " + Math.floor((tnow-tstart)/1000) + " seconds" );
    //console.log(view.swarmStatusProgressEl); //view.swarmStatusProgressTemplate({progress: Math.floor(pct*100)}));
    //TODO why isnt this working if we try and use templating to update the HTML?
    view.swarmStatusProgressEl.attr({'style':'width:' + Math.floor(pct*100) + "%;"});

    // map the data to the underlying models in the collection, and define a key function to join elements to data
    var cards = this.svg.selectAll(".peer")
        .data(data.models, function(d){return d.id;});

    cards.append("title");

    cards.enter().append("rect")
        .attr("x", function(d,i) { return (i%view.xbuckets) * view.gridSize; })
        .attr("y", function(d,i) { return (Math.floor(i/view.xbuckets)) * view.gridSize; })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("class", "peer bordered")
        .attr("width", view.gridSize)
        .attr("height", view.gridSize)
        .style("fill", view.defaultColor);

    cards.transition().duration(200)
        .style("fill", function(d) { return view.colorScale(d.get('downloaded')); });

    //cards.select("title").text(function(d) { return d.value; });
    cards.exit().remove();
    //TODO
    return this;
  }
});


var targets = new TargetCollection;
targets.fetch({
  success: function(){ },
  error: function(e){ }
});
var seedingcollection = new SeedStatusCollection([ ]);
var targetviews = [];
var seedingview;



//---- streams
var es = subscribe("/v1/events");
var datestream = Bacon.interval(1000,0).map(function(x){ return new Date(); }).toProperty(new Date());
//var randomstream = Bacon.interval(100,0).toProperty();

// TODO remove me, this just sets the collection to a dummy set
/*
var tmp = [];
for (var i = 0 ; i < 1000 ; i++ ){
  tmp.push(new SeedStatus({
    id: i,
    downloaded: Math.random()*100,
  }));
}
seedingcollection.reset(tmp);
*/


var tstart = new Date(); //TODO fixme, this is just when we load the page...
// this should be grabbed when starting the deploy

var seedstream = streamify(es,"nutstatus").toProperty()
  .onValue(function(v){
    console.log("got a nut status:",v);
    seedingcollection.add(new SeedStatus(v),{merge:true});
  });

// FUCKER! why cant i .merge a observable with an eventstream?!
/*randomstream.onValue(function(v){
    // of those that arent done, set one to done
    var stilldownloading = seedingcollection.select(function(d){return d.get('downloaded') < 100;});
    for (var i = 0; i < 5 ; i++ ){
      var x = _.sample(stilldownloading);
      if (x){
        var y = 100;
        //console.log("setting " , x.id , " to ",y );
        x.set('downloaded',y);
        seedingcollection.add(x,{merge:true});
      }
    }
    //console.log("tick!",seedingcollection.get(x.id));
});
*/
var targetstatuseventstream = streamify(es,"status").toProperty();
var targetsstream = Bacon.fromPromise($.ajax({ url : "/v1/targets"}))
  .toProperty()
  .onValue(function(v){
    console.log("target status",v);
    targets.add(v);
  });


$(document).ready(function(){
  targetviews = [];
  targets.on('add',function(target){
    //create a new view
    var newel = $('.target-statuses').append("<div></div>");
    var targetview = new TargetStatusView({model: target, el: newel});
    targetviews.push(targetview);
  });

  seedingview = new SeedingStatusView({model: seedingcollection, el: $('.seeding-status')});


});
