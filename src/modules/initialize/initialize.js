'use strict';

angular.module('kalabox.initialize', [
  'ngRoute',
  'kalabox.nodewrappers'
])
.config(function ($routeProvider) {
  $routeProvider.when('/initialize', {
    templateUrl: 'modules/initialize/initialize.html',
    controller: 'InitializeCtrl'
  });
})
.controller('InitializeCtrl',
['$scope', '$location', 'globalConfig',
  function ($scope, $location, globalConfig) {

    var gui = require('nw.gui');
    var mb = new gui.Menu({type: 'menubar'});
    if (process.platform === 'darwin') {
      mb.createMacBuiltin('Kalabox', {hideEdit: true, hideWindow: true});
    }
    gui.Window.get().menu = mb;

    // Best practices is to manage our data in a scope object
    $scope.ui = {
      messageText: 'initializing...'
    };

    // Decide on next location.
    globalConfig.then(function(globalConfig) {
      if (globalConfig.provisioned) {
        $location.path('/dashboard');
      } else {
        $location.path('/start');
      }
    });

  }]);
