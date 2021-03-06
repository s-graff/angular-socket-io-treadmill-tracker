
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

// Connect to database and setup to reconnect on disconnect..
var connection = null;
function handleDisconnectedDb(){
   connection = mysql.createConnection( secrets.mysqlConnectionParams );
   connection.connect( function( error ){
      if( error ) {
         console.log('Error on connecting to database: ', error );
         setTimeout( handleDisconnectedDb, 3000 );
      }
   } );
   connection.on( "error", function( error ) {
      console.log( "Database error: ", error );
      if( error.code === "PROTOCOL_CONNECTION_LOST" ){
         handleDisconnectedDb();
      }else{
         // Don't handle any error other than connection-lost:
         throw error;
      }
   } );
}
handleDisconnectedDb();
                                                         
// Open serial port:
var serialPort = configSerialPort.open();

var userId = '00000000';
// Socket.io Communication
io.sockets.on('connection', function (socket) {
   var speedChanged = true;
   var oldSpeed;
   socket.on('userIdEmitted', function(data) {
      socket.broadcast.emit('userIdBroadcast', data);
      userId = data.userId;
   });
   socket.emit('userIdBroadcast', {userId:userId});
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
      var row={session_id:'4',speed:speed,timestamp:timestamp,distance:totalDistance,incline:4.0,user_id:userId}; //3=Spencer, 4=James
      connection.query(
         "INSERT INTO diary SET ?",
         row,
         function( err, result ){
            if (err) throw err;
            console.log("insertId = "+result.insertId+", userId: " + userId + "\n");
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
