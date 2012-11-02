// CONFIG START
var url = "http://dsl.tb-stream.net:80/";
var maxslots = 5;
var statsint = 200; // in milliseconds
var statsheadint = 20; // the interval is statsint*statsheadint
var listenip = "0.0.0.0";
var listenport = 8000;
//CONFIG END

// BUILD START
var http = require("http");
var radio = require("radio-stream");
var slots = {};
var statsstate = 0;
var bytessent = 0;
var bytesreceived = 0;
var stream = radio.createReadStream(url);
// BUILD END

stream.on("data", function (chunk) {
	bytesreceived += chunk.length;
	for (var slot in slots){
		slots[slot].write(chunk);
		bytessent += chunk.length;
	};
});
var server = http.createServer(function(req, res){
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
	var slotsused = server.connections;
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
