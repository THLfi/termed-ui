(function (angular) { 'use strict';

angular.module('termed.graphs.permissions', ['pascalprecht.translate', 'termed.rest'])

.directive('thlGraphPermissionsEdit', function($translate, $q) {
  return {
    restrict: 'E',
    scope: {
      permissionsMap: '=',
      graphRoles: '='
    },
    templateUrl: 'app/graphs/permissions/permissions-edit.html',
    controller: function($scope) {
      $scope.permissions = ["READ", "INSERT", "UPDATE", "DELETE"];

      $scope.togglePermission = function(permissionsMap, graphRole, permission) {
        if (!permissionsMap[graphRole]) {
          permissionsMap[graphRole] = [];
        }

        const permissions = permissionsMap[graphRole];

        const i = permissions.indexOf(permission);
        if (i > -1) {
          permissions.splice(i, 1);
        } else {
          permissions.push(permission);
        }
      };
    }
  };
});

})(window.angular);
