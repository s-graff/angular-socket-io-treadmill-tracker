'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
controller('AppCtrl', function ($scope, socket) {
   var scope = $scope;
   socket.on('update', function (data) {
      scope.speed = data.speed;
      scope.speedper = scope.speed * 10;
      scope.totalDistance = data.totalDistance;
   });
}).
controller('MyCtrl1', function ($scope, socket) {
});
