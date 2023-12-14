(function(angular) {
  'use strict';

  angular.module('termed.nodes.references', ['pascalprecht.translate', 'termed.rest', 'ngSanitize'])

  .directive('thlNodeReferences', function($translate, ReferenceAttributeList, NodeReferenceList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/references/references.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
          ReferenceAttributeList.query({
            graphId: node.type.graph.id,
            typeId: node.type.id
          }, function(refAttrs) {
            $scope.refAttrs = refAttrs;
            for (var i = 0; i < refAttrs.length; i++) {
              node.references[refAttrs[i].id] = NodeReferenceList.query({
                graphId: node.type.graph.id,
                typeId: node.type.id,
                id: node.id,
                attributeId: refAttrs[i].id
              });
            }
          });
        });
      }
    };
  })

  .directive('thlNodeRevisionReferences', function($translate, ReferenceAttributeList, NodeRevision) {
    return {
      restrict: 'E',
      scope: {
        node: '=',
        revision: '@'
      },
      templateUrl: 'app/nodes/references/revision-references.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
          ReferenceAttributeList.query({
            graphId: node.type.graph.id,
            typeId: node.type.id
          }, function(refAttrs) {
            $scope.refAttrs = refAttrs;
            for (var i = 0; i < refAttrs.length; i++) {
              var attrId = refAttrs[i].id;
              var refs = node.references[attrId] || [];
              for (var j = 0; j < refs.length; j++) {
                var ref = refs[j];
                node.references[attrId][j] = NodeRevision.get({
                  graphId: ref.type.graph.id,
                  typeId: ref.type.id,
                  id: ref.id,
                  number: $scope.revision
                });
              }
            }
          });
        });
      }
    };
  })

  .directive('thlNodeReferencesEdit', function($translate, ReferenceAttributeList, NodeList) {
    return {
      restrict: 'E',
      scope: {
        node: '='
      },
      templateUrl: 'app/nodes/references/references-edit.html',
      controller: function($scope) {
        $scope.lang = $translate.use();

        $scope.node.$promise.then(function(node) {
          $scope.refAttrs = ReferenceAttributeList.query({
            graphId: node.type.graph.id,
            typeId: node.type.id
          });
        });
      }
    };
  })

  .directive('thlSelectNode', function($q, $timeout, $sanitize, $translate, Node, TypeNodeList) {
    return {
      scope: {
        'ngModel': "=",
        'refAttr': '='
      },
      link: function(scope, elem, attrs) {

        function getLocalizedPrefLabel(properties) {
          var lang = $translate.use();

          if (properties.prefLabel && properties.prefLabel.length > 0) {
            for (var i = 0; i < properties.prefLabel.length; i++) {
              if (properties.prefLabel[i].lang == lang) {
                return properties.prefLabel[i].value;
              }
            }
            return properties.prefLabel[0].value;
          }

          return "-";
        }

        elem.select2({
          allowClear: true,
          multiple: !!attrs.multiple,
          query: function(query) {
            TypeNodeList.query({
              graphId: scope.refAttr.range.graph.id,
              typeId: scope.refAttr.range.id,
              query: query.term
            }, function(results) {
              query.callback({
                results: results
              });
            });
          },
          formatResult: function(result) {
            return $sanitize(getLocalizedPrefLabel(result.properties)) + " " +
              "<small class='text-muted'>" +
              $sanitize(result.uri || "") + " " + $sanitize(result.code || "") +
              "</small>";
          },
          formatSelection: function(result) {
            return $sanitize(getLocalizedPrefLabel(result.properties));
          },
          sortResults: function(results) {
            results.sort(
              (a, b) => getLocalizedPrefLabel(a.properties).localeCompare(getLocalizedPrefLabel(b.properties))
            );
            return results;
          }          
        });

        elem.select2("container").find("ul.select2-choices").sortable({
          containment: 'parent',
          start: function() {
            elem.select2("onSortStart");
          },
          update: function() {
            elem.select2("onSortEnd");
          }
        });

        elem.on('change', function() {
          scope.$apply(function() {
            if (!elem.select2('data')) {
              scope.ngModel = "";
            } else {
              scope.ngModel = elem.select2('data');
            }
          });
        });

        scope.$watch('ngModel', function(ngModel) {
          if (!ngModel) {
            if (elem.select2('data')) {
              // defer clean to avoid element change inside $watch
              $timeout(function() {
                elem.select2('data', '');
              });
            }
            return;
          }

          if (attrs.multiple) {
            var promiseGet = function(idObject) {
              var d = $q.defer();
              Node.get({
                graphId: scope.refAttr.range.graph.id,
                typeId: scope.refAttr.range.id,
                id: idObject.id
              }, function(result) {
                d.resolve(result);
              });
              return d.promise;
            };

            var promises = [];
            for (var i = 0; i < ngModel.length; i++) {
              promises.push(promiseGet(ngModel[i]));
            }

            // wait for all Node.gets
            $q.all(promises).then(function(data) {
              elem.select2('data', data);
            });
          } else {
            Node.get({
              graphId: scope.refAttr.range.graph.id,
              typeId: scope.refAttr.range.id,
              id: ngModel.id
            }, function(node) {
              elem.select2('data', node);
            });
          }
        }, true);
      }
    };
  })

  .directive('thlSelectProperty', function($q, $timeout, $sanitize, $translate, Node, TypeNodeTreeList) {
    return {
      scope: {
        'ngModel': "=",
        'textAttr': '='
      },
      link: function(scope, elem, attrs) {

        function getLocalizedProperty(property) {
          var lang = $translate.use();

          if (property && property.length > 0) {
            for (var i = 0; i < property.length; i++) {
              if (property[i].lang == lang) {
                return property[i].value;
              }
            }
            return property[0].value;
          }

          return "-";
        }

        function queryNodeAttributeValues(terms, oldResults, callback) {
          var where = terms.map(function(t) { return "p." + scope.textAttr.id + ":" + t + "*"; }).join(" AND ");
          var whereNot = oldResults.map(function(t) { return "(NOT p." + scope.textAttr.id + ":\"" + t + "\")"; }).join(" AND ");
          where = (where != "" && whereNot != "") ? where + " AND " + whereNot : where + whereNot;
          TypeNodeTreeList.query({
            graphId: scope.textAttr.domain.graph.id,
            typeId: scope.textAttr.domain.id,
            select: "properties." + scope.textAttr.id,
            where: where
          }, function(results) {
            results = results
              // filter nodes with missing property
              .filter(function(result) {return result.properties[scope.textAttr.id] !== undefined;})
              // map to attribute value
              .map(function(result) { return getLocalizedProperty(result.properties[scope.textAttr.id]); });
            if (results.length == 0) {
              callback(oldResults);
            } else {
              // concatenate to previous results
              results = oldResults.concat(results)
                // filter unique properties
                .filter(function(value, index, self){
                  return self.indexOf(value) === index;
                });
              if (results.length > 25) {
                callback(results);
              } else {
                queryNodeAttributeValues(terms, results, callback);
              }
            }
          });
        }

        elem.select2({
          allowClear: true,
          multiple: !!attrs.multiple,
          query: function(query) {
            var terms = (query.term.match(/\S+/g) || []);
            var results = [];
            queryNodeAttributeValues(terms, results, function(results) {
              // map to select2 data format
              results = results.map(function(result){
                return {
                  id: result,
                  text: result
                };
              });
              query.callback({
                results: results
              });
            });
          }
        });

        elem.select2("container").find("ul.select2-choices").sortable({
          containment: 'parent',
          start: function() {
            elem.select2("onSortStart");
          },
          update: function() {
            elem.select2("onSortEnd");
          }
        });

        elem.on('change', function() {
          scope.$apply(function() {
            if (!elem.select2('data')) {
              scope.ngModel = "";
            } else {
              scope.ngModel = elem.select2('data');
            }
          });
        });

        scope.$watch('ngModel', function(ngModel) {
          if (!ngModel) {
            if (elem.select2('data')) {
              // defer clean to avoid element change inside $watch
              $timeout(function() {
                elem.select2('data', '');
              });
            }
            return;
          }
          elem.select2('data', ngModel);
        }, true);
      }
    };
  });

})(window.angular);
