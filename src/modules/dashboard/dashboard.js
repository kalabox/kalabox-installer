'use strict';

angular.module('kalabox.dashboard', [
  'ui.router',
  'ui.bootstrap',
  'kalabox.nodewrappers',
  'kalabox.guiEngine'
])
.config(function($stateProvider) {
  $stateProvider.state('dashboard', {
    url: '/dashboard',
    views: {
      '': {
        controller: 'DashboardCtrl',
        templateUrl: 'modules/dashboard/dashboard.html.tmpl'
      },
      'platforms@dashboard': {
        controller: 'DashboardCtrl',
        templateUrl: 'modules/dashboard/platforms.html.tmpl'
      }
    }
  });
})
/*
 * Start site if site is stopped, stop site if site is started.
 */
.directive('siteToggle', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        return guiEngine.try(function() {
          // Query running state of site.
          return $scope.site.isRunning()
          .then(function(isRunning) {
            var name = $scope.site.name;
            if (isRunning) {
              // Stop site.
              guiEngine.queue.add('Stop Site: ' + name, function() {
                return $scope.site.stop();
              });
            } else {
              // Start site.
              guiEngine.queue.add('Start Site: ' + name, function() {
                return $scope.site.start();
              });
            }
          });
        });
      });
    }
  };
})
.directive('siteTrash', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          var areYouSure = true;
          if (areYouSure) {
            var desc = 'Remove Site: ' + $scope.site.name;
            guiEngine.queue.add(desc, function() {
              return $scope.site.trash();
            });
          }
        });
      });
    }
  };
})
.directive('siteBrowser', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          // Get reference to nw gui.
          var gui = require('nw.gui');
          // Open folder in os' default file browser.
          gui.Shell.openExternal($scope.site.url);
        });
      });
    }
  };
})
.directive('siteCode', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          var gui = require('nw.gui');
          gui.Shell.openItem($scope.site.codeFolder);
        });
      });
    }
  };
})
.directive('providerClick', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          if ($scope.provider.authorized()) {
            $scope.provider.refresh();
          } else {
            var authModal = $scope.open(
              'modules/dashboard/auth-modal.html.tmpl',
              'AuthModal',
              {
                provider: $scope.provider
              }
            );
            return authModal.result;
          }
        });
      });
    }
  };
})
.controller(
  'DashboardCtrl',
  function($scope, $uibModal, $timeout, $interval, $q, kbox,
    sites, providers, siteStates, _, guiEngine, $rootScope) {

  //Init ui model.
  $scope.ui = {
    sites: [],
    states: {},
    jobs: []
  };

  $rootScope.providers = [];

  // Modal creator.
  $scope.open = function(templateUrl, controllerName, data) {
    var uibModalInstance = $uibModal.open({
      animation: true,
      templateUrl: templateUrl,
      controller: controllerName,
      size: 'lg',
      resolve: {
        modalData: function() {
          return data;
        }
      }
    });
    return uibModalInstance;
  };

  // Handle shutting down of kalabox.
  guiEngine.try(function() {
    // Get nw window object.
    var win = require('nw.gui').Window.get();
    // Hook into the gui window closing event.
    win.on('close', function() {

      var self = this;

      // Open a modal window to inform the user that app is shutting down.
      $q.try(function() {
        var shutdownModal = $scope.open(
          'modules/dashboard/shutdown.html.tmpl',
          'ShutdownModal',
          {win: self}
        );
        shutdownModal.result.then(function(result) {
          console.log('Shutdown ran', result);
        });
      });

      // Stop the gui engine.
      guiEngine.stop()
      // Close.
      .then(function() {
        self.close(true);
      });

    });
  });

  // Initialize providers.
  guiEngine.try(function() {
    return providers.get()
    .then(function(providers) {
      $rootScope.providers = providers;
    });
  });

  // Poll sites.
  guiEngine.loop.add({interval: 1 * 60 * 1000}, function() {
    return sites.get()
    .then(function(sites) {
      $scope.ui.sites = sites;
    });
  });

  // Poll site states.
  guiEngine.loop.add({interval: 10 * 1000}, function() {
    return siteStates.get()
    .then(function(states) {
      $scope.ui.states = states;
    });
  });

  // Poll engine status.
  guiEngine.loop.add({interval: 0.25 * 60 * 1000}, function() {
    return kbox.then(function(kbox) {
      return kbox.engine.isUp();
    })
    .then(function(isUp) {
      $scope.ui.engineStatus = isUp;
    });
  });

  // Poll list of errors.
  guiEngine.loop.add({interval: 0.25 * 100}, function() {
    $scope.ui.errors = guiEngine.errors.list();
  });

  if ($scope.ui.errors) {
    $scope.open(
      'modules/dashboard/error-modal.html.tmpl',
      'ErrorModal',
      {errors: $scope.ui.errors, parentScope: $scope}
    );
  }

})
.controller(
  'ErrorModal',
  function($scope, $q, $uibModalInstance, kbox, _, modalData) {

  $scope.errors = modalData.errors;
  $scope.ok = function() {
    modalData.parentScope.ui.errors = [];
    $uibModalInstance.close();
  };
})
.controller(
  'SiteCtrl',
  function($scope) {
  // Code for setting site state on view.
  $scope.siteClasses = function() {
    var currentAction = $scope.site.currentAction ? $scope.site.currentAction :
    '';
    var siteUp = $scope.ui.states[$scope.site.name] ? 'site-up' : '';
    return currentAction + ' ' + siteUp;
  };
  $scope.currentActionName = function() {
    if ($scope.site.currentAction) {
      var actions = {stop: 'Stopping', start: 'Starting', 'delete': 'Deleting'};
      return actions[$scope.site.currentAction];
    }
    return false;
  };
})
.controller(
  'AuthModal',
  function($scope, $uibModalInstance, kbox, _, modalData, guiEngine,
    providers, $rootScope) {

    guiEngine.try(function() {
      $scope.errorMessage = false;
      // Auth on submission.
      $scope.ok = function(email, password) {
        return modalData.provider.authorize(email, password)
        .then(function() {
          $uibModalInstance.close({username: email});
          return providers.get()
          .then(function(providers) {
            $rootScope.providers = providers;
          });
        })
        .catch(function(err) {
          $scope.errorMessage = 'Failed to validate: ' + err.message;
          throw err;
        });
      };
      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };
    });

  }
)
.controller(
  'ShutdownModal',
  function($scope, $q, $uibModalInstance, kbox, _, modalData, guiEngine) {

    guiEngine.try(function() {
      $scope.ok = function() {
        modalData.win.close(true);
      };
    });

  }
);
