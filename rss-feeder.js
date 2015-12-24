var http = require('http')
var sax = require('sax');





function RSSTorrentFeeder(torrentCollection, host, path){
	function process(body){
		var item, param;
		var parser = sax.parser(true);

		parser.onopentag = function(node){
			if(node.name == "item"){
				item = {};
			} else if (item && (node.name == "title" || node.name == "link")){
				item[node.name] = '';
				param = node.name;
			}
		}
		parser.onclosetag = function(tag){
			param = null;
			if(tag == 'item'){
				if(!torrentCollection.has(item))
					torrentCollection.add(item);
			}
		}
		
		parser.ontext = function(text){
			if(item && param){
				item[param] = text;
			}
		}
		parser.write(body).end();
	}

	function check(){
		console.log("Getting RSS Feed: ", host, path);
		http.get({
			host: host,
			path: path,
		}, function(response) {
			// Continuously update stream with data
			var body = '';
			response.on('data', function(d) {
				body+=d;
			});
			response.on('end', function() {
				// Data reception is done, do whatever with it!
				process(body);
				
			});
		});
	}
	
	return {
		start : function(){
			check();
			setInterval(check, 3600*1000 /* every hour */);
		}
	}
}

module.exports = RSSTorrentFeeder;