var fs = require('fs')
var path = require('path');

var self = module.exports = {
	logfile_path: path.join(__dirname, 'shiplog.log'),
	sw: null,
	log: function(str){
		console.log(str);
		if(!this.sw){
			console.log('no sw');
			this.sw = fs.createWriteStream(this.logfile_path, {flags : 'w'});
		}
		var now = new Date();
		var timestamp = now.toLocaleDateString("en-gb") + ' ' + now.toLocaleTimeString("en-gb");
		this.sw.write('(' + timestamp + ') ' + str + '\r\n');
	},
	heading: function(str){
		this.log('===============' + str + '===============');
	}
}