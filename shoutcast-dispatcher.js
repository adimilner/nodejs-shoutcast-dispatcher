console.log("core: starting");
/* sc-dispatcher.js for node.js written by Team CryptCo.de.
   Please report bugs and proposals to code@cryptco.de or post them
   in our forum at http://forum.dedilink.eu/viewforum.php?f=16 (dont
   worry, the forum is operated in german language but also other
   users are welcome to post there). Thank you for your support and
   for using sc-dispatcher.js */

// CONFIG START
/* url -> Source-Stream URL
   statsint -> Interval in milliseconds in which the statistics show
               up when there is a minimum of one client connected.
               [0=disable]
   statsintnocl -> Interval in milliseconds in which the statistics
                   show up when there is no client connected.
                   [-1=fallback to statsint|0=disable]
   statsheadint -> Interval in -statsint- or -statsintnocl- in which
                   the header(descr.) for the stats show up.
                   [0=disabled]
   listenip -> IP-Address where to listen for clients.
               [0.0.0.0=default]
   listenport -> Port where to listen for clients.
                 [8000=default]
   strmidletime -> Time in milliseconds when to disconnect from the
                   sourcestream when the last client disconnects.
                   [0=disable]
*/
var url          = "http://mp3.hb-stream.net/"
  , maxslots     = 500
  , statsint     = 15000
  , statsintnocl = 360000
  , statsheadint = 20
  , listenip     = "0.0.0.0"
  , listenport   = 8000
  , strmidletime = 5000;
//CONFIG END

// INIT START
var http          = require("http")
  , radio         = require("radio-stream")
  , statsstate    = 0
  , bytessent     = 0
  , bytesreceived = 0
  , stream        = null
  , server        = null
  , stopstreamtck = null
  , slotsused     = 0
  , sigint        = false
  , clients       = {}
  , disconnecting = null
  , statsinttimer = null;
// INIT END

server = http.createServer(function(req, res) {
	res.writeHead(200,{
		"Content-Type":		"audio/mpeg",
		"Connection":		"Close"
	});
	if(slotsused+1 <= maxslots) {
		var time = new Date().getTime();
		console.log("client: connected");
		if(slotsused == 0) {
			if(stopstreamtck != null) {
				console.log("stream: reusing");
				clearTimeout(stopstreamtck);
				stopstreamtck = null;
			}
			if(stream == null) {
				console.log("stream: connecting");
				stream = radio.createReadStream(url);
				stream.on("data", function(chunk) {
					bytesreceived += chunk.length;
				});
			}
			if(statsinttimer != null) {
				clearTimeout(statsinttimer);
				statsinttimer = setTimeout(function() { showstats(false); }, statsint);
			}		
		}
		var chunklistenercallback = function(chunk) {
			res.write(chunk);
			bytessent += chunk.length;
		};
		stream.on("data", chunklistenercallback);
		slotsused += 1;
		clients[time] = res;
		res.on("close", function() {
			if(typeof(clients[time]) != "undefined") {
				delete clients[time];
				delete time;
			}
			console.log("client: disconnected");
			slotsused -= 1;
			if(stream != null) {
				stream.removeListener("data", chunklistenercallback);
				delete chunklistenercallback;
			}
			if(slotsused == 0) {
				if(strmidletime > 0) {
					console.log("stream: disconnecting");
					stopstreamtck = setTimeout(function() {
						clearTimeout(stopstreamtck);
						stream.destroy();
						stream = null;
						stopstreamtck = null;
						console.log("stream: disconnected");
					}, strmidletime);
				}
				if(statsinttimer != null) {
					clearTimeout(statsinttimer);
					if(statsint > 0) {
						if(statsintnocl == -1) {
							statsinttimer = setTimeout(function() { showstats(false); }, statsint);
						} else if(statsintnocl == 0) {
							statsinttimer = setTimeout(function() { showstats(true); }, statsint);
						} else {
							statsinttimer = setTimeout(function() { showstats(false); }, statsintnocl);
						}
					}
				}
			}
		});
	}
	else
	{
		res.end("Server full");
	}
});
process.on('SIGINT', function () {
	if(sigint == false) {
		sigint = true;
		console.log("core: stopping - ^C to kill");
		if(statsinttimer != null)
			clearTimeout(statsinttimer);
		else
			statsint = 0;
		if(server != null) {
			console.log("server: dropping "+server.connections+" clients");
			for(client in clients)
				if(typeof(clients[client]) != "undefined")
					clients[client].end();
		}
		disconnecting = setInterval(function() {
			if(server != null && server.connections > 0)
				console.log("server: still dropping "+server.connections+" clients");
			else {
				clearInterval(disconnecting);
				if(server != null)
				{
					console.log("server: stopping");
					server.close();
				}
				disconnecting = setInterval(function() {
					if(server != null)
						console.log("server: still stopping");
					else {
						clearInterval(disconnecting);
						if(stream != null)
						{
							console.log("stream: disconnecting");
							stream.destroy();
						}
						disconnecting = setInterval(function() {
							console.log("core: stopping");
							console.log("core: bye");
							process.exit(0);
						}, 250);
					}
				}, 250);
			}
		}, 250);
	} else {
		console.log("core: killing");
		process.exit(1);
	}
});
function showstats(bqt) {
	if(statsint > 0)
	{
		if(slotsused > 0) {
			statsinttimer = setTimeout(function() { showstats(false); }, statsint);
		} else {
			if(statsintnocl == -1) {
				statsinttimer = setTimeout(function() { showstats(false); }, statsint);
			} else if(statsintnocl == 0) {
				statsinttimer = setTimeout(function() { showstats(true); }, statsint);
			} else {
				statsinttimer = setTimeout(function() { showstats(false); }, statsintnocl);
			}
		}
		if(bqt != true) {
			if(statsheadint != 0) {
				if(statsstate == 0)
					console.log("statsdesc:slotsused|slotsavail|revcd|sent|uptime");
				statsstate += 1;
				if(statsstate >= statsheadint)
					statsstate = 0;
			}
			console.log("stats:"+slotsused+"|"+maxslots+"|"+bytesreceived+"|"+bytessent+"|"+process.uptime());
		}
	}
}
server.listen(listenport, listenip);
server.maxConnections = maxslots+1;
server.on("close", function() {
	server = null;
});
server.on("error", function(e) {
	if(e.code == "EADDRINUSE") {
		console.log("Server: error - Address already in use");
		console.log("core: killing");
		process.exit(2);
	}
});
server.on("listening", function() {
	console.log("server: listening - "+listenip+":"+listenport);
	if(statsint > 0) {
			if(statsintnocl == -1) {
				showstats(false);
			} else if(statsintnocl == 0) {
				showstats(true);
			} else {
				showstats(false);
			}
	}
});
