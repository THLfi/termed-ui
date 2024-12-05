(function (angular) { 'use strict';

angular.module('termed.graphs', ['ngRoute', 'termed.rest', 'termed.graphs.properties', 'termed.graphs.permissions'])

.config(function($routeProvider) {
  $routeProvider

  .when('/graphs/', {
    templateUrl: 'app/graphs/graph-list.html',
    controller: 'GraphListCtrl',
    reloadOnSearch: false
  })

  .when('/graphs/:graphId/edit', {
    templateUrl: 'app/graphs/graph-edit.html',
    controller: 'GraphEditCtrl'
  });
})

.controller('GraphListCtrl', function($scope, $location, $translate, $filter, GraphList, NodeTreeList) {

  $scope.lang = $translate.use();

  $scope.query = "";
  $scope.max = 50;

  $scope.loadMoreResults = function() {
    $scope.max += 50;
    $scope.searchNodes($scope.query);
  };

  $scope.searchNodes = function(query) {
    const parsedQuery = (query.match(/\S+/g) || []).map(
        function (token) {
          return 'properties.prefLabel.' + $scope.lang + ':' + token + '*';
        });

    NodeTreeList.query({
      select: 'id,type,properties.*',
      where: parsedQuery,
      max: $scope.max
    }, function(nodes) {
      $scope.nodes = nodes;
    });
  };

  const graphIndex = {};

  $scope.graphs = GraphList.query({
    orderBy: 'prefLabel.fi'
  }, function(graphs) {
    graphs.forEach(function(s) {
      graphIndex[s.id] = s;
    });
  });

  $scope.localizedPrefLabel = function(graph) {
    return $filter("localizeValue")(graph.properties.prefLabel);
  };

  $scope.graphById = function(graphId) {
    return graphIndex[graphId];
  };

  $scope.newGraph = function() {
    GraphList.save({
      properties: {
        prefLabel: [
          {
            lang: "fi",
            value: "Uusi aineisto"
          }
        ]
      }
    }, function(graph) {
      $location.path('/graphs/' + graph.id + '/edit');
    });
  };

})

.controller('GraphEditCtrl', function($scope, $routeParams, $location, $translate, Graph, Type, TypeList, PropertyList, GraphNodeList, TypeNodeList, GraphDump, $sce) {

  $scope.lang = $translate.use();

  $scope.checkboxState = false;
  $scope.editEnabled = false;
  $scope.originalCode = null;
  $scope.originalUri = null;
  $scope.confirmEdit = function() {
    if ($scope.editEnabled) {
      $('#editConfirmModal').modal('show'); // Show confirmation modal
    }
  };

  $scope.attemptToggleCheckbox = function(event) {

    const hasChanges = $scope.graph.code !== $scope.originalCode || $scope.graph.uri !== $scope.originalUri;

    if ($scope.checkboxState && !hasChanges) {
      // If there are no changes and the checkbox can be unchecked, allow normal behavior
      $scope.checkboxState = !$scope.checkboxState;
      $scope.editEnabled = $scope.checkboxState;
      return;
    }

    event.preventDefault(); // Prevent the checkbox state from changing
    // Update translations (popup translations are not automatically updated if locale is changed during edit)
    $scope.trustedEditWarning = $sce.trustAsHtml($translate.instant('warnEditCodeUri'));
    $scope.trustedRevertWarning = $sce.trustAsHtml($translate.instant('warnRevertCodeUri'));
    $scope.tempCheckboxState = !$scope.checkboxState; // Update the temporary state
    if ($scope.tempCheckboxState) {
      $('#editConfirmModal').modal('show'); // Show the modal to allow editing
    } else {
      if (hasChanges) {
        $('#restoreConfirmModal').modal('show'); // Show the modal to confirm reverting
      } else {
        $scope.disableEdit(); // Remove edit permissions
      }
    }
  };

  // Confirm enabling editing
  $scope.confirmEnableEdit = function() {
    $scope.checkboxState = true;
    $scope.editEnabled = true;
    $('#editConfirmModal').modal('hide');
  };

  // Cancel enabling editing
  $scope.cancelEnableEdit = function() {
    $scope.tempCheckboxState = $scope.checkboxState;
    $('#editConfirmModal').modal('hide');
  };

  // Confirm disabling editing and restoring values
  $scope.confirmDisableEdit = function() {
    $scope.checkboxState = false
    $scope.disableEdit();
    $('#restoreConfirmModal').modal('hide');
  };

  // Cancel disabling editing
  $scope.cancelDisableEdit = function() {
    $scope.tempCheckboxState = $scope.checkboxState;
    $('#restoreConfirmModal').modal('hide');
  };

  // Disable editing and restore original values
  $scope.disableEdit = function() {
    $scope.editEnabled = false;
    $scope.graph.code = angular.copy($scope.originalCode);
    $scope.graph.uri = angular.copy($scope.originalUri);
  };

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  }, function(graph) {
    $scope.types = TypeList.query({ graphId: graph.id });
    $scope.originalCode = angular.copy(graph.code); // Save original Code
    $scope.originalUri = angular.copy(graph.uri); // Save original URI
  });

  $scope.properties = PropertyList.query();

  $scope.save = function() {
    $scope.graph.$save(function() {
      TypeList.replace({ graphId: $routeParams.graphId }, $scope.types, function() {
        $location.path('/graphs/' + $routeParams.graphId + '/nodes');
      }, function(error) {
        $scope.error = error;
      });
    }, function(error) {
      $scope.error = error;
    });
  };

  $scope.duplicate = function() {
    GraphDump.save({ graphId: $routeParams.graphId, copy: true }, {}, function() {
      $location.path('/graphs');
    }, function(error) {
      $scope.error = error;
    });
  };

  $scope.remove = function() {
    GraphNodeList.remove({ graphId: $routeParams.graphId }).$promise
    .then(function() {
      return TypeList.remove({ graphId: $routeParams.graphId }).$promise;
    }).then(function() {
      return $scope.graph.$delete({ graphId: $routeParams.graphId}).$promise;
    }).then(function() {
      $location.path('/graphs');
    }, function(error) {
      $scope.error = error;
    });
  };

  $scope.addGraphRole = function(graphRole) {
    $scope.graph.roles.push(graphRole);
  };

  $scope.newType = function() {
    $scope.types.unshift({
      id: "NewType_" + new Date().getTime(),
      properties: {
        prefLabel: [
          {
            lang: "fi",
            value: "Uusi luokka"
          }
        ]
      },
      permissions: {},
      textAttributes: [
        {
          id: "prefLabel",
          regex: "(?s)^.*$",
          properties: {
            prefLabel: [
              {
                lang: "fi",
                value: "Nimike"
              }
            ]
          },
          permissions: {}
        }
      ]
    });
  };

  $scope.selectType = function(type) {
    $scope.type = type;
  };

  $scope.removeType = function(type) {
    const i = $scope.types.indexOf(type);
    $scope.types.splice(i, 1);
  };

  $scope.copyTypePermissionsToAttributes = function(type) {
    if (!type.permissions) {
      return;
    }
    if (type.textAttributes) {
      type.textAttributes.forEach(function(a) {
        a.permissions = angular.copy(type.permissions);
      });
    }
    if (type.referenceAttributes) {
      type.referenceAttributes.forEach(function(a) {
        a.permissions = angular.copy(type.permissions);
      });
    }
  };

  $scope.newTextAttribute = function(type) {
    if (!type.textAttributes) {
      type.textAttributes = [];
    }
    type.textAttributes.push({
      id: "newTextAttribute",
      regex: "(?s)^.*$",
      properties: {
        prefLabel: [
          {
            lang: "fi",
            value: "Uusi tekstiattribuutti"
          }
        ]
      },
      permissions: {}
    });
  };

  $scope.selectTextAttribute = function(textAttribute) {
    $scope.textAttribute = textAttribute;
  };

  $scope.removeTextAttribute = function(type, textAttribute) {
    const i = type.textAttributes.indexOf(textAttribute);
    type.textAttributes.splice(i, 1);
  };

  $scope.newReferenceAttribute = function(type) {
    if (!type.referenceAttributes) {
      type.referenceAttributes = [];
    }
    type.referenceAttributes.push({
      id: "newReferenceAttribute",
      properties: {
        prefLabel: [
          {
            lang: "fi",
            value: "Uusi viiteattribuutit"
          }
        ]
      },
      permissions: {}
    });
  };

  $scope.selectReferenceAttribute = function(referenceAttribute) {
    $scope.referenceAttribute = referenceAttribute;
  };

  $scope.removeReferenceAttribute = function(type, referenceAttribute) {
    const i = type.referenceAttributes.indexOf(referenceAttribute);
    type.referenceAttributes.splice(i, 1);
  };

});

})(window.angular);
