'use strict';

/* Controllers */
angular.module('myApp.controllers', []).
controller('AppCtrl', function ($scope, socket) {
   $scope.userNames = {
      "00000003":"Spencer",
      "00000004":"James",
      "00000001":"Dev"
   };
   $scope.userIds = ["00000003","00000004","00000001"];
   $scope.radio = {model : undefined};
   $scope.sessionId = "00000";
   $scope.userId = "00000000";
   $scope.userName = " -- ";
   $scope.speed = 0.0;
   $scope.speedper = 0.0;
   $scope.totalDistance = 0.0;
   socket.on('update', function (data) {
      $scope.speed = data.speed;
      $scope.speedper = $scope.speed * 10;
      $scope.totalDistance = data.totalDistance;
   });
   socket.on('userIdBroadcast', function (data) {
      $scope.radio = {model : data.userId};
      $scope.userName = $scope.userNames[data.userId];
   });
   $scope.$on('userIdEmitted', function( event, data ){
      var zeroes = "00000000";
      var uId = data.userId;
      if( typeof uId === "number" ){
         if( uId.length > zeroes.length ) uId = "";
         uId = zeroes.substr(0,8-uId.length) + uId;
      }
      if( uId != $scope.userId ){
         data.userId = uId;
         $scope.userId = uId;
         $scope.userName = $scope.userNames[uId];
         socket.emit( 'userIdEmitted', data ); 
      }
   });

}).
controller('MyCtrl1', function ($scope, socket) {
});
