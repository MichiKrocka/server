var cronJob = require("cron").CronJob;
var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');
var util = require('util');

var pwd = process.cwd();

var server = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  fs.lstat(pwd + request.url, function(err, stats) {
    if(err) {
      switch(request.url) {
        case '/get':
          console.log((new Date()) + ' get');
          response.end("GET");
          return;
        case '/set':
          console.log((new Date()) + ' set');
          response.end("SET");
          return;
      }
      response.writeHead(404);
      response.end(request.url + " not found..");
      return;
    }
    if(stats.isDirectory()) {
      var dir = fs.readdirSync(pwd + request.url).sort();
      for(var d in dir) {
        response.write(util.format('<a href="%s">%s</a><br>', dir[d], dir[d]));
      }
      response.end();
      return;
    }
    response.writeHead(404);
    fs.createReadStream(pwd + request.url).pipe(response);
  });
  return;
});

server.listen(8080, function() {
  console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
  httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser. You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
//console.log(origin);
    // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }
  var connection = request.accept('echo-protocol', request.origin);
  console.log((new Date()) + ' Connection accepted.');

  connection.on('message', function(message) {
console.log(request.key);
    if (message.type === 'utf8') {
      console.log('Received Message: ' + message.utf8Data);
      var counter = 0;

            new cronJob('* * * * * *', function(){
                counter++;
                connection.sendUTF("Hello" + counter);
                console.log("Hello" + counter);
            }, null, true, "America/Los_Angeles");
        } else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function(reasonCode, description) {
console.log(request.key);
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

