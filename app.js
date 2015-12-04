//host: 'showrss.info',
//path: '/rss.php?user_id=284179'
var express = require('express');
var path = require('path');
var torrents_folder = path.join('/cargo', 'full-torrents');
var play_folder = path.join('/cargo', 'play');
var torrentCollection = new (require('./torrent-collection'))();

var WebTorrent = require('webtorrent');

var client = new WebTorrent();

var rssfeeder = require('./rss-feeder')(torrentCollection, 
										'showrss.info', 
										'/rss.php?user_id=284179');
var Mp4Converter = require('./mp4-converter');
var SubtitleDownloader = require('./subtitles-downloader');

SubtitleDownloader.login();
										
torrentCollection.on('new', function(item){
	if(item.ready){
		item.progress = 1;
		console.log('skip ' + item.title);
		return;
	}
	else client.add(item.link, {path: torrents_folder}, function (torrent) {
	   torrent.on('download', function(chunkSize){	  
		  item.progress = torrent.progress;
	   });
	   torrent.on('done', function(){
		  	var maxIndex = 0, maxSize = 0;
			torrent.files.map(function (file, i) {
				if(file.length > maxSize){
					maxSize = file.length;
					maxIndex = i;
				}
			});
			item.filePath = path.join(torrents_folder, torrent.files[maxIndex].path);
			queueConvert(item);
	   });
	});
});
var queue = []
var interval;
var busy = false;
function queueConvert(item){
	queue.push(item);
	clearInterval(interval);
	interval = setInterval(function(){
		if(!busy){
			downloadSubtitlesFor(queue.shift())
				if(queue.length == 0)
					clearInterval(interval);
		}
	}, 1000);
}
function downloadSubtitlesFor(item){
	busy = true;
	SubtitleDownloader.process(item.filePath, function(srt){
		var converter = new Mp4Converter(path.resolve(item.filePath), 
										path.resolve(path.join(play_folder, item.title+'.mp4')), 
										srt ? path.resolve(srt) : null);
		converter.on('progress', function(p){
			item.progress = p;
			console.log("ASD " + p);
		})
		converter.on('done', function(){
			item.ready = true;
			item.progress = 1;
			torrentCollection.save();
			console.log("ready!");
			setTimeout(function(){
				busy = false;
			}, 1000);
			
		})
		converter.start();
	});
}
torrentCollection.load('torrents.json');
torrentCollection.autosave('torrents.json');
										
rssfeeder.start();


var app = express();

app.get('/torrents', function (req, res) {
	var c = [];
	torrentCollection.each(function(torrent){
		c.push({title:torrent.title, progress:torrent.progress || 0, ready:torrent.ready || false})
	});
	res.send(JSON.stringify(c));
});

var dlnaServer;
var dlna = require('./dlna-server');

var networkAddress = require('network-address');

var AirplayBrowser = new require( './browser' ).Browser;
var AirplayClient = require( './airplay-client' ).Client;
var airclient;

function airplayer(filename){
	if(dlnaServer)
		dlnaServer.destroy();
	if(airclient)
		airclient.stop();
	dlnaServer = new dlna(path.resolve(filename));

	dlnaServer.listen(9000, function(){
		console.log('listening on : ' + dlnaServer.address().port);
	})


	var href = ('http://' + networkAddress() + ':' + dlnaServer.address().port + '/0');
	
	if(!airclient){
		var browser = new AirplayBrowser();
		browser.on( 'deviceOn', function( device ) {
			console.log('connected to ' + device.name);
			airclient = new AirplayClient(device.host);
			airclient.play(href);
		});
	}else
		airclient.play(href);
}

var bodyParser = require('body-parser');
var favicon = require('express-favicon');
 
app.use(favicon(__dirname + '/static/favicon.ico'));

app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use('/static', express.static('static'));

app.post('/play', function(req, res){
  var title = req.body.title;
  console.log('respond ended ' + title);
  airplayer(path.join(play_folder, title+'.mp4'));
  res.send('success');
});

app.post('/stop', function(req, res){
	if(airclient)
		airclient.stop();
	res.send('success');
});

app.get('/', function(req,res){
   client.destroy();
   res.sendFile('index.html', {root:'./static'})
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
