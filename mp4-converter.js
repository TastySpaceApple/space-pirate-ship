var child_process = require('child_process');
var events = require('events');
var util = require('util');
var logger = require('./logger');

var Mp4Converter = function(input, output, srt) {
	this.input = input;
	this.output = output;
	this.srt = srt;
};
util.inherits(Mp4Converter, events.EventEmitter);


Mp4Converter.prototype.start = function() {
	var ffprobe = util.format('ffprobe -hide_banner -print_format json -show_format -show_streams "%s"', this.input);
	// When outputting to json, you have to opt in to each piece of info.
	this.emit('ffprobeCommand', ffprobe);
	child_process.exec(ffprobe, (function(error, stdout, stderr) {
		if (error !== null) {
			return this.emit('error', error);
		}
		this.ffprobeJson = JSON.parse(stdout);
		this.emit('ffprobeOutput', this.ffprobeJson);
		return this.ffmpeg();
	}).bind(this));	
}



Mp4Converter.prototype.ffmpeg = function() {
	var codecVideo = 'libx264';
	var codecAudio = 'aac';
	this.ffprobeJson.streams.forEach(function(stream) {
		if (stream['codec_type'] === 'video' && stream['codec_name'] === 'h264') {
			codecVideo = 'copy';
		}
		if (stream['codec_type'] === 'audio' && stream['codec_name'] === 'aac') {
			codecAudio = 'copy';
		}
	});
	
	if(this.srt){
	}
	
	this.emit('codecVideo', codecVideo);
	this.emit('codecAudio', codecAudio);
	
	this.duration = parseFloat(this.ffprobeJson.format.duration);
	this.emit('duration', this.duration);
	
	var args = [
		'-y',
		'-i',
		this.input];
	if(this.srt) args = args.concat([
		'-fix_sub_duration',
		'-i',
		this.srt,
		'-c:s', 
		'mov_text',
		'-metadata:s:s:0',
		'language=eng',
	]);
	args = args.concat([
		'-c:v',
		codecVideo,
		'-c:a',
		codecAudio,
		this.output,
	]);
	logger.heading('RUNNING FFMPEG');
	logger.log("Executing ffmpeg " + args.join(" "));
	var child = child_process.spawn('ffmpeg', args);
	var that = this;
	
	child.stdout.on('data', function(data) {
		logger.log(data.toString());
	});
	child.stderr.on('data', function(data) {
		logger.log(data.toString());
		var duration = parseFfmpegOutput(data.toString());
		if (duration) {
			var progress = duration / that.duration;
			that.emit('progress', progress);
		}
	});
	
	child.on('error', function(err) {
		that.emit('error', err);
	});
	child.on('exit', function(code, signal) {
		if (code !== 0) {
			that.emit('error', 'Unsuccessful exit code '+code, signal);
			return;
		}
		that.emit('done');
	});
}



var sampleOutput = "frame=  262 fps=0.0 q=-1.0 size=   10334kB time=00:00:10.80 bitrate=7836.5kbits/s\n"
	+ "frame=  521 fps=520 q=-1.0 size=   14946kB time=00:00:21.60 bitrate=5666.7kbits/s";

function parseFfmpegOutput(data) {
	// Parse some output and return the duration corresponding to the first match,
	// or null if there's no match.
	var matches = data.match(/time=\d{2}:\d{2}:\d{2}/);
	if (!matches) {
		return null;
	}
	var match = matches[0];
	var hours   = parseInt(match.substr(5, 2));
	var minutes = parseInt(match.substr(8, 2));
	var seconds = parseInt(match.substr(11, 2));
	return hours*60*60 + minutes*60 + seconds;
}



module.exports = Mp4Converter;
