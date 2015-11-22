var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

function TorrentCollection(){ //TODO: move out to another file
	this.collection = [];
	EventEmitter.call(this);
}

util.inherits(TorrentCollection, EventEmitter);

TorrentCollection.prototype.add = function(torrent){
	this.collection.push(torrent);
	this.emit('new', torrent);
}

TorrentCollection.prototype.has = function(torrent){
	for(var i=0; i < this.collection.length; i++){
		if(this.collection[i].title == torrent.title) // not the greatest check I'll admit
			return true;
	}
	return false;
}

TorrentCollection.prototype.save = function(filepath){
	if(filepath)
		this.filepath = filepath;
	else if(this.filepath)
		filepath = this.filepath;
	else
		throw new "No path specified for saving";
	
	var c = [];
	for(var i=0; i<this.collection.length; i++){
		var t = this.collection[i];
		c.push({title: t.title, link:t.link, ready:t.ready || false});
	}
	fs.writeFile(filepath, JSON.stringify(c), function(err) {
		//saved..
	}); 
}
TorrentCollection.prototype.autosave = function(filepath, timeout){
	timeout = timeout || 2000;
	var self = this;
	var timer;
	self.on('new', function(){
		clearTimeout(timer);
		timer = setTimeout(function(){
			self.save(filepath);
		}, timeout);
	});
}

TorrentCollection.prototype.load = function(filepath){
	var self = this;
	fs.readFile(filepath, function(err, data){
		if(err) return;
		try{
			var c = JSON.parse(data);
			for(var i=0; i < c.length; i++){
				if(!self.has(c[i]))
					self.add(c[i]);
			}
		}catch(e){}
			
	});
}
TorrentCollection.prototype.each = function(callback){
	for(var i=0; i < this.collection.length; i++)
		callback(this.collection[i]);
}

module.exports = TorrentCollection