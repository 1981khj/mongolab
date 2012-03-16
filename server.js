var port = process.env.PORT;
var express = require('express');
var app = express.createServer();
var fs = require('fs');
var util = require('util');
var io = require('socket.io').listen(app)
var mongo = require("mongoskin");
var mongoUrl = "mongodb://mongolab:mongolab@ds031407.mongolab.com:31407/mongolab?auto_reconnect"; 
var db = mongo.db(mongoUrl);
var collection = db.collection("mongolab");
var nicklist = {};

app.configure(function() {
  app.set('views', __dirname + '/views');  
  app.set('view engine', 'jade');  
  app.register('.html', require('jade'));
  app.set("view options", {layout: false});
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());  
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

//디비에 데이터 채우기
app.get('/mongo/:id', function(req, res) {
    collection.insert({content:req.params.id});
    res.render('index.html');
});

//데이터 갖고 오기
app.get('/dbs', function(req, res){    
    collection.find().toArray(function(err, items) {
        if (err) throw err;
 
		res.send(JSON.stringify(items));
	});  
});

app.get('/', function(req, res) {
    res.render('index.html');
});

app.get('/chat', function(req, res) {
     fs.readFile(__dirname + '/public/page/chat.html', 'utf8', function(err, text){
        res.send(text);
    });
});


app.get('/musichtml', function(req, res) {
     fs.readFile(__dirname + '/public/page/index.html', 'utf8', function(err, text){
        res.send(text);
    });
});

app.get('/music', function(req, res) {
    var mp3File = __dirname + '/public/music/Maid with the Flaxen Hair.mp3';
    var stat = fs.statSync(mp3File);
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });
    var readStream = fs.createReadStream(mp3File);
    util.pump(readStream, res);
});

io.sockets.on('connection', function(socket) {
    socket.on('join', function(nick){
    	nicklist[nick] = socket.nickname = nick;

		socket.broadcast.emit('joinok', nick);
		io.sockets.emit('nicknames', nicklist);
		io.sockets.emit('log', nick+' [connect]');
	});
    /*Add Chat Message*/
    socket.on('sendmsg', function(msg){    	
		io.sockets.emit('log', socket.nickname+' : '+msg);
        collection.insert({content:socket.nickname+' : '+msg});
	});

	socket.on('disconnect', function(){
		delete nicklist[socket.nickname];
		socket.broadcast.emit('log', socket.nickname+' [disconnect]');
		socket.broadcast.emit('nicknames',nicklist);
	});
});

if (!module.parent) {
  app.listen(port);
  console.log('Server is Running! listening on port '+port);
}