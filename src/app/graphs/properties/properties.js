(function (angular) { 'use strict';

angular.module('termed.graphs.properties', ['pascalprecht.translate', 'termed.rest'])

.directive('thlGraphPropertiesEdit', function($translate, PropertyList) {
  return {
    restrict: 'E',
    scope: {
      propertyMap: '='
    },
    templateUrl: 'app/graphs/properties/properties-edit.html',
    controller: function($scope) {

      $scope.properties = PropertyList.query();

      $scope.ensureProperty = function(properties, propertyId) {
        if (!properties[propertyId]) {
          properties[propertyId] = [];
        }

        const values = properties[propertyId];

        // remove all empty values (not including the last one)
        for (let i = 0; i < values.length - 1; i++) {
          if (values[i].lang === "" && values[i].value === "") {
            values.splice(i, 1);
            i--;
          }
        }

        // ensure that last value is empty
        if (values.length === 0 || values[values.length - 1].value !== "") {
          values.push({ lang:'', value:'' });
        }

        return true;
      };

    }
  };
});

})(window.angular);
