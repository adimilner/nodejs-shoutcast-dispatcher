// CONFIG START
var url          = "http://dsl.tb-stream.net:80/"
  , maxslots     = 500
  , statsint     = 15000
  , statsheadint = 20
  , listenip     = "0.0.0.0"
  , listenport   = 8001
  , strmidletime = 5000;
//CONFIG END

// BUILD START
var http          = require("http")
  , radio         = require("radio-stream")
  , statsstate    = 0
  , bytessent     = 0
  , bytesreceived = 0
  , stream        = null
  , server        = null
  , stopstreamtck = null;
// BUILD END

server = http.createServer(function(req, res) {
	res.writeHead(200,{
		"Content-Type":		"audio/mpeg",
		"Transfer-Encoding":	"chunked",
		"Connection":		"Close"
	});
	if(server.connections <= maxslots) {
		console.log("Client connected");
		if(stream == null || stream.connected != true || stopstreamtck != null) {
			if(stopstreamtck != null) {
				console.log("Reusing stream connection");
				clearTimeout(stopstreamtck);
				if(stopstreamtck == null) {
					stream = radio.createReadStream(url);
				}
				stopstreamtck = null;
			}
			else {
				console.log("Building stream connection ...");
				stream = radio.createReadStream(url);
			}
		}
		stream.on("data", function(chunk) {
			res.write(chunk);
			bytesreceived += chunk.length/server.connections;
			bytessent += chunk.length;
		});
		res.on("close", function() {
			console.log("Client disconnected.");
			if(server.connections == 0) {
				console.log("Last client disconnected. Killing stream connection ...");
				stopstreamtck = setTimeout(function() {
					stream.destroy();
					stream = null;
					stopstreamtck = null;
					console.log("Stream connection killed.");
				}, strmidletime);
			}
		});
	}
	else
		res.end("Server full");
});
setInterval(function() {
	slotsused = server.connections;
	if(statsheadint != 0) {
		if(statsstate == 0)
			console.log("STATSDESC:SLOTSUSED|BYTESRECEIVED|BYTESSENT");
		statsstate += 1;
		if(statsstate >= statsheadint)
			statsstate = 0;
	}
	console.log("STATS:"+slotsused+"|"+bytesreceived+"|"+bytessent);
}, statsint);
server.listen(listenport, listenip);
