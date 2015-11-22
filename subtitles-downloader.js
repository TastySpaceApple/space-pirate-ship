var OS = require('opensubtitles-api');
var userAgent = 'Popcorn Time v1';
var path = require('path')
var http = require('http');
var fs = require('fs');

var OpenSubtitles;

module.exports = {
	login : function(user, pass){
		OpenSubtitles = new OS(userAgent, 'Spacey', 'vosojihoto');
	},
	process : function (filename, callback){
		if(!OpenSubtitles) OpenSubtitles = new OS(userAgent);
		var fpath = path.parse(filename);
		var dest = path.join(fpath.dir, fpath.name) + '.srt';
		fs.stat(dest, function(err, stat) {
			if(err == null) {
				callback(dest);
			} else {
				console.log('Searching for subtitles... '+filename);
				var searchOptions = [
					{
						sublanguageid: 'en',
						lang:'en',
						query: path.basename(filename)
					},
					{
						sublanguageid: 'en',
						lang:'en',
						path: filename
					}
				]
				var accuracy = searchOptions.length - 1;
				function search(){
					OpenSubtitles.search(searchOptions[accuracy]).then(function(data){
						if(data.en){
							console.log('Subtitles found. Downloading');
							console.log(data);
							downloadFile(data.en.url, dest, callback);
						} else{
							console.log('Cannot find subtitles, reducing accuracy');
							accuracy--;
							if(accuracy == -1){
								console.log('No methods left. Subtitles not found.');
								callback(null);
							}
							else
								search()
						}
					});
				}
				search();
								
			}
		});

	},
}
function downloadFile (url, dest, callback){
	console.log('Downloading from '+url);
	var file = fs.createWriteStream(dest);
	var request = http.get(url, function(response) {
		response.pipe(file);
		callback(dest);
	});
}
