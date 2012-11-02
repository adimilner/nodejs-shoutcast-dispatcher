// CONFIG START
var url          = "http://dsl.tb-stream.net:80/"
  , maxslots     = 500
  , statsint     = 15000
  , statsheadint = 20
  , listenip     = "0.0.0.0"
  , listenport   = 8000;
//CONFIG END

// INIT START
var http          = require("http")
  , radio         = require("radio-stream")
  , slots         = {}
  , statsstate    = 0
  , bytessent     = 0
  , bytesreceived = 0
  , stream        = radio.createReadStream(url)
  , slot          = null
  , server        = null
  , slotsused     = null;
// INIT END

stream.on("data", function (chunk) {
	bytesreceived += chunk.length;
	for (slot in slots){
		slots[slot].write(chunk);
		bytessent += chunk.length;
	};
});

server = http.createServer(function(req, res){
	res.writeHead(200,{
		"Content-Type":		"audio/mpeg",
		"Transfer-Encoding":	"chunked",
		"Connection":		"Close"
	});
	if(server.connections <= maxslots)
	{
		var time = new Date().getTime();
		slots[time] = res;
		console.error("Connected user: "+time);
		res.on("close", function() {
			delete slots[time];
			console.error("Disconnected user: "+time);
		});
	}
	else
		res.end("Server full");
});

setInterval(function() {
	slotsused = server.connections;
	if(statsheadint != 0)
	{
		if(statsstate == 0)
			console.log("STATSDESC:SLOTSUSED|BYTESRECEIVED|BYTESSENT");
		statsstate += 1;
		if(statsstate >= statsheadint)
			statsstate = 0;
	}
	console.log("STATS:"+slotsused+"|"+bytesreceived+"|"+bytessent);
}, statsint);

server.listen(listenport, listenip);
