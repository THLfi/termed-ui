(function (angular) { 'use strict';

angular.module('termed.admin', ['ngRoute'])

.config(function($routeProvider) {
  $routeProvider

  .when('/admin', {
    templateUrl: 'app/admin/admin.html',
    controller: 'AdminCtrl'
  })

  .when('/admin/users', {
    templateUrl: 'app/admin/users.html',
    controller: 'UsersCtrl'
  });
})

.controller('AdminCtrl', function($scope, $http, $filter, GraphList) {

  $scope.graphs = GraphList.query();

  $scope.localizedPrefLabel = function(graph) {
    return $filter("localizeValue")(graph.properties.prefLabel);
  };

  $scope.deleteGraphNodeCodes = function(graphId) {
    $scope.processing = true;

    $http({
      method: 'DELETE',
      url: 'api/graphs/' + graphId + '/node-codes'
    }).then(function(success) {
      $scope.processing = false;
    }, function(error) {
      $scope.error = error;
      $scope.processing = false;
    });
  };

  $scope.reindexAll = function() {
    $scope.indexing = true;

    $http({
      method: 'DELETE',
      url: 'api/index'
    }).then(function(success) {
      $scope.indexing = false;
    }, function(error) {
      $scope.error = error;
      $scope.indexing = false;
    });
  };

  $scope.reindexGraph = function(graphId) {
    $scope.indexing = true;

    $http({
      method: 'DELETE',
      url: 'api/graphs/' + graphId + '/index'
    }).then(function(success) {
      $scope.indexing = false;
    }, function(error) {
      $scope.error = error;
      $scope.indexing = false;
    });
  };

  $scope.invalidateCaches = function() {
    $scope.invalidatingCaches = true;

    $http({
      method: 'DELETE',
      url: 'api/caches'
    }).then(function(success) {
      $scope.invalidatingCaches = false;
    }, function(error) {
      $scope.error = error;
      $scope.invalidatingCaches = false;
    });
  };

  $scope.remote = {
    url: "http://<remote-termed>/api/graphs/<graph-id>/dump",
    username: "admin",
    password: "admin"
  };

  $scope.restore = function() {
    $scope.restoring = true;

    $http({
      method: 'POST',
      url: 'api/restore?remote=true',
      data: $scope.remote
    }).then(function(success) {
      $scope.restoring = false;
    }, function(error) {
      $scope.error = error;
      $scope.restoring = false;
    });
  };

  $scope.purgeRevisions = function() {
    $scope.purging = true;

    $http({
      method: 'DELETE',
      url: 'api/revisions'
    }).then(function(success) {
      $scope.purging = false;
    }, function(error) {
      $scope.error = error;
      $scope.purging = false;
    });
  };

})

.controller('UsersCtrl', function($scope, UserList, GraphList) {

  $scope.users = UserList.query();

  $scope.graphsById = {};
  $scope.graphs = GraphList.query({}, function(graphs) {
    for (let i = 0; i < graphs.length; i++) {
      $scope.graphsById[graphs[i].id] = graphs[i];
    }
  });

  $scope.newUser = function() {
    $scope.user = {
      updatePassword: true,
      graphRoles: []
    };
  };

  $scope.editUser = function(user) {
    $scope.user = angular.copy(user);
  };

  $scope.newGraphRole = function(user) {
    $scope.user.graphRoles.push({});
  };

  $scope.removeGraphRole = function(user, graphRole) {
    const i = user.graphRoles.indexOf(graphRole);
    user.graphRoles.splice(i, 1);
  };

  $scope.saveUser = function(user) {
    UserList.save({'updatePassword': !!user.updatePassword}, user, function() {
      $scope.users = UserList.query();
    }, function(error) {
      $scope.error = error;
    });
  };

  $scope.removeUser = function(user) {
    UserList.remove({'username': user.username}, function() {
      $scope.users = UserList.query();
    }, function(error) {
      $scope.error = error;
    });
  };

});

})(window.angular);
