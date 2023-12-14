(function(angular) {
  'use strict';

  angular.module('termed.nodes.referrers', ['pascalprecht.translate', 'termed.rest'])

  .directive('thlNodeReferrers', function($translate, NodeReferrerList, TypeList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/referrers/referrers.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {

          $scope.typesById = {};
          $scope.referenceAttributesByTypeAndId = {};

          $scope.types = TypeList.query({
            graphId: node.type.graph.id
          }, function(types) {
            types.forEach(function(c) {
              $scope.typesById[c.id] = c;
              $scope.referenceAttributesByTypeAndId[c.id] = {};
              c.referenceAttributes.forEach(function(r) {
                $scope.referenceAttributesByTypeAndId[c.id][r.id]=r;
              });
            });
          });

          for (const attrId in node.referrers) {
            node.referrers[attrId] = NodeReferrerList.query({
              graphId: node.type.graph.id,
              typeId: node.type.id,
              id: node.id,
              attributeId: attrId
            });
          }
        });

        $scope.isEmpty = function(obj) {
          for (const i in obj) {
            if (obj.hasOwnProperty(i)) {
              return false;
            }
          }
          return true;
        };
      }
    };
  });

})(window.angular);
