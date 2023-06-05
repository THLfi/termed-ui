(function(angular) {
  'use strict';

  angular.module('termed.nodes.properties', ['pascalprecht.translate', 'termed.rest'])

  .directive('thlNodeProperties', function($translate, TextAttributeList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/properties/properties.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
          $scope.textAttrs = TextAttributeList.query({
            graphId: node.type.graph.id,
            typeId: node.type.id
          });
        });
      }
    };
  })

  .directive('thlNodePropertiesEdit', function($translate, TextAttributeList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/properties/properties-edit.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
          TextAttributeList.query({
            graphId: node.type.graph.id,
            typeId: node.type.id
          }, function(textAttrs) {
            $scope.textAttrs = textAttrs;

            // start watching properties for changes and update form accordingly
            $scope.$watch('node.properties', function() {
              ensureProperties();
            }, true);
          });
        });

        function ensureProperties() {
          $scope.textAttrs.forEach(function(textAttr) {
            ensureProperty($scope.node.properties, textAttr.id, textAttr.regex);
          });
        }

        function ensureProperty(nodeProperties, textAttrId, textAttrRegex) {
          if (!nodeProperties[textAttrId]) {
            nodeProperties[textAttrId] = [];
          }

          const values = nodeProperties[textAttrId];

          // remove all empty values (not including the last one)
          for (let i = 0; i < values.length - 1; i++) {
            if (values[i].lang === "" && values[i].value === "") {
              values.splice(i, 1);
              i--;
            }
          }

          // ensure that last value is empty
          if (values.length === 0 || values[values.length - 1].value !== "") {
            values.push({ lang:'', value:'', regex: textAttrRegex });
          }
        }
      }
    };
  });

})(window.angular);
