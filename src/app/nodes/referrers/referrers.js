(function(angular) {
  'use strict';

  angular.module('termed.nodes.referrers', ['pascalprecht.translate', 'termed.rest'])

  .directive('thlNodeReferrers', function($translate, NodeReferrerList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/referrers/referrers.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
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
