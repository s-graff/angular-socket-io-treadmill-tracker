
/**
 * Module dependency
 */

var express = require('express');
var routes = require('./routes');
var api = require('./routes/api');
var http = require('http');
var path = require('path');
var secrets = require('./secrets');
var mysql = require('mysql');
var configSerialPort = require('./configSerialPort');
var app = module.exports = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
//app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}

// production only
if (app.get('env') === 'production') {
  // TODO
};


/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/name', api.name);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

// Open local serial port and database.
var connection = mysql.createConnection( secrets.mysqlConnectionParams );
var serialPort = configSerialPort.open();

// Socket.io Communication
io.sockets.on('connection', function (socket) {
   var speedChanged = true;
   var oldSpeed;
   serialPort.on('data', function(serialData) {
      var duration = serialData.split("=")[1];
      var speed = (0.0003066 * (duration)) - 2.2114;
      speed = Math.round(speed*10)/10;
      if (speed < 0) { speed = 0; }
      if (speed == oldSpeed) {
         speedChanged = false;
      } else {
         speedChanged = true;
      }
      oldSpeed = speed;
//      speed += "mph";
      var data = {speed: speed, totalDistance:totalDistance};
      if (speedChanged) {
         socket.emit('update', data);
         console.log("SPEED = " + speed);
      }
   });
});

var db_speedChanged = true;
var db_oldSpeed;
var oldTime = new Date().getTime();
var totalDistance = 0;
serialPort.on('data', function(serialData) {
   var duration = serialData.split("=")[1];
   var speed = (0.0003066 * (duration)) - 2.2114;
   speed = Math.round(speed*10)/10;
   if (speed < 0) { speed = 0; }
   if (speed == db_oldSpeed) {
      db_speedChanged = false;
   } else {
      db_speedChanged = true;
   }
   db_oldSpeed = speed;
   // speed += "mph";
   // var data = {speed: speed};
   if (db_speedChanged) {
      var timestamp = Math.round(new Date().getTime()/10)/100;
      var diffTime = new Date().getTime() - oldTime;
      totalDistance += db_oldSpeed * (diffTime / 1000 / 60 / 60);
      console.log("diffTime: " + diffTime + " milliseconds, totalDistance: " + totalDistance + "\r\n");
      var row={session_id:'3',speed:speed,timestamp:timestamp,distance:totalDistance,incline:4.0,user_id:3}; //3=Spencer, 4=James
      connection.query(
         "INSERT INTO diary SET ?",
         row,
         function( err, result ){
            if (err) throw err;
            console.log("insertId = "+result.insertId+"\n");
         }
      );
      oldTime = new Date().getTime();
      if (speed == 0) {
         totalDistance = 0;
         //and insert new session, then update session used above
      }
   }
});

/**
 * Start Server
 */

server.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
