// CONFIG START
var url          = "http://dsl.tb-stream.net:80/"
  , maxslots     = 500
  , statsint     = 15000
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
  , slotsused     = 0;
// INIT END

server = http.createServer(function(req, res) {
	res.writeHead(200,{
		"Content-Type":		"audio/mpeg",
		"Transfer-Encoding":	"chunked",
		"Connection":		"Close"
	});
	if(slotsused+1 <= maxslots) {
		console.log("Client connected");
		var clientconnected = true;
		if(stream == null || stopstreamtck != null) {
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
				stream.on("data", function(chunk) {
					bytesreceived += chunk.length;
				});
			}
		}
		stream.on("data", function(chunk) {
			if(clientconnected == true) {
				res.write(chunk);
				bytessent += chunk.length;
			}
		});
		slotsused += 1;
		res.on("close", function() {
			console.log("Client disconnected.");
			clientconnected = false;
			slotsused -= 1;
			if(slotsused == 0) {
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
