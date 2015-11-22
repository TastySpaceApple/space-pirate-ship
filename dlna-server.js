module.exports = Server

var http = require('http');
var pump = require('pump');
var rangeParser = require('range-parser');
var url = require('url');
var fs = require('fs');
var debug = console.log;

function Server (filepath) {
  var server = http.createServer()

  var stats = fs.statSync(filepath);
  var sockets = []

  server.on('connection', function (socket) {
	console.log('connection');
    socket.setTimeout(36000000)
    sockets.push(socket)
    socket.on('close', function () {
      var index = sockets.indexOf(socket)
      if (index >= 0) sockets.splice(index, 1)
    })
  })

  server.destroy = function (cb) {
    sockets.forEach(function (socket) {
      socket.destroy()
    })
    server.close(cb)
  }

  server.on('request', function (req, res) {
    debug('onRequest')

    // Allow CORS requests to specify arbitrary headers, e.g. 'Range',
    // by responding to the OPTIONS preflight request with the specified
    // origin and requested headers.
    if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      res.setHeader(
        'Access-Control-Allow-Headers',
        req.headers['access-control-request-headers']
      )
      res.setHeader('Access-Control-Max-Age', '1728000')
      return res.end()
    }

    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    var pathname = url.parse(req.url).pathname
    if (pathname === '/favicon.ico') return res.end()

    onReady()

    function onReady () {

      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Type', 'video/mp4');
      res.statusCode = 200

      // Support DLNA streaming
      res.setHeader('transferMode.dlna.org', 'Streaming')
      res.setHeader(
        'contentFeatures.dlna.org',
        'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000'
      )
	  //console.log(req);
      var range
      if (req.headers.range) {
        res.statusCode = 206
        // no support for multi-range reqs
        range = rangeParser(stats.size, req.headers.range)[0]
        debug('range %s', JSON.stringify(range))
        res.setHeader(
          'Content-Range',
          'bytes ' + range.start + '-' + range.end + '/' + stats.size
        )
        res.setHeader('Content-Length', range.end - range.start + 1)
      } else {
        res.setHeader('Content-Length', stats.size)
      }
      if (req.method === 'HEAD') res.end()
      pump(fs.createReadStream(filepath, range), res)
    }
  })

  return server
}