var torrentStream = require('torrent-stream');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function TorrentClient(){
  this.torrents = [];
}
TorrentClient.prototype.add = function(magnetlink, opts, callback){
  var t = new Torrent(magnetlink, opts);
  this.torrents.push(t);
  t.on('ready', callback);
}

function Torrent(magnetlink, opts){
  EventEmitter.call(this);
  var self = this;
  this.pieces_downloaded = 0;
  
  var engine = this.engine = torrentStream(magnetlink, opts);
  /*this.engine.on('idle', function(){
    self.emit('done')
  });*/
  
  this.engine.on('ready', this.onReady.bind(this));
}
Torrent.prototype.onReady = function(){
  var self = this;
  this.emit('ready', this);
  var largestFile = null;
  this.engine.files.forEach(function(file){
    if(largestFile == null || file.length > largestFile.length)
      largestFile = file;
    file.deselect();
  });
  largestFile.select();
  this.totalLength = largestFile.length;
  this.engine.on('idle', function(){
    self.files = self.engine.files;
    self.emit('done');
    clearTimeout(self.downloadTimer);
  });
  this.downloadTimer = setInterval(this.onTick.bind(this), 1000);
}
Torrent.prototype.onTick = function(){
  this.progress = this.engine.swarm.downloaded / this.totalLength;
  this.emit('download');
  console.log(this.progress);
}
util.inherits(Torrent, EventEmitter);

module.exports = TorrentClient;