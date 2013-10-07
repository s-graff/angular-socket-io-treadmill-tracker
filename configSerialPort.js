var com = require("serialport");
var info = {
   name:"/dev/ttyUSB0",
   params:{
      baudrate: 38400,
      parser: com.parsers.readline('\r\n')
   },
   serialPort:null,
   isOpen:false,
   open:null,
   onOpen:null
};
info.onOpen = function(){
   info.isOpen = true;
   console.log('Serial port open');
}
info.open = function(){
   info.serialPort = new com.SerialPort( info.name, info.params );
   info.serialPort.on('open', info.onOpen );
   return info.serialPort;
};
module.exports = info;

