(function (angular) { 'use strict';

angular.module('termed.nodes', ['ngRoute', 'termed.rest', 'termed.nodes.references', 'termed.nodes.referrers', 'termed.nodes.properties', 'termed.nodes.revisions'])

.config(function($routeProvider) {
  $routeProvider

  .when('/graphs/:graphId/nodes', {
    templateUrl: 'app/nodes/node-list.html',
    controller: 'NodeListCtrl',
    reloadOnSearch: false
  })

  .when('/graphs/:graphId/types/:typeId/nodes', {
    templateUrl: 'app/nodes/node-list-by-type.html',
    controller: 'NodeListByTypeCtrl',
    reloadOnSearch: false
  })

  .when('/graphs/:graphId/nodes-all', {
    templateUrl: 'app/nodes/node-list-all.html',
    controller: 'NodeListAllCtrl',
    reloadOnSearch: false
  })

  .when('/graphs/:graphId/nodes-sparql', {
    templateUrl: 'app/nodes/node-list-sparql.html',
    controller: 'NodeListSparqlCtrl'
  })

  .when('/graphs/:graphId/types/:typeId/nodes/:id', {
    templateUrl: 'app/nodes/node.html',
    controller: 'NodeCtrl'
  })

  .when('/graphs/:graphId/types/:typeId/nodes/:id/revisions/:number', {
    templateUrl: 'app/nodes/node-revision.html',
    controller: 'NodeRevisionCtrl'
  })

  .when('/graphs/:graphId/types/:typeId/nodes/:id/edit', {
    templateUrl: 'app/nodes/node-edit.html',
    controller: 'NodeEditCtrl'
  });
})


.controller('NodeListCtrl', function($scope, $route, $location, $routeParams, $translate, Graph, GraphNodeTreeList, GraphNodeCount, NodeList, Node, TypeList) {

  $scope.lang = $translate.use();

  $scope.query = ($location.search()).q || "";
  $scope.max = 25;

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

  $scope.typesById = {};

  $scope.types = TypeList.query({
    graphId: $routeParams.graphId
  }, function(types) {
    types.forEach(function(c) {
      $scope.typesById[c.id] = c;
    });
    // load initial results
    $scope.searchNodes(($location.search()).q || "");
  });

  $scope.loadMoreResults = function() {
    $scope.max += 50;
    $scope.searchNodes(($location.search()).q || "");
  };

  $scope.loadAllResults = function() {
    $scope.max = -1;
    $scope.searchNodes(($location.search()).q || "");
  };

  $scope.searchNodes = function(query) {
    var tokens = (query.match(/\S+/g) || []);
    var where = [];

    $scope.types.forEach(function(type) {
      var whereType = [];
      
      whereType.push("graph.id:" + type.graph.id);
      whereType.push("type.id:" + type.id);

      if (tokens.length > 0) {
        var whereTypeProperties = [];

        whereTypeProperties.push("p.prefLabel." + $scope.lang + ":\"" + query + "\"^4");

        whereTypeProperties.push(tokens.map(function(token) {
          return "p.prefLabel." + $scope.lang + ":" + token + "*^2";
        }).join(" AND "));

        type.textAttributes.slice(0, 3).forEach(function(textAttribute) {
          whereTypeProperties.push(tokens.map(function(token) {
            return "p." + textAttribute.id + ":" + token + "*";
          }).join(" AND "));
        });

        whereType.push("(" + whereTypeProperties.join(" OR ") + ")");
      }

      where.push("(" + whereType.join(" AND ") + ")");
    });

    GraphNodeCount.get({
      graphId: $routeParams.graphId,
      where: where.join(" OR ")
    }, function(result) {
      $scope.count = result.count;
    });

    GraphNodeTreeList.query({
      graphId: $routeParams.graphId,
      select: 'id,code,uri,type,p.*,r.*',
      where: where.join(" OR "),
      max: $scope.max,
      sort: query ? '' : 'properties.prefLabel.' + $scope.lang + '.sortable'
    }, function(nodes) {
      $scope.nodes = nodes;
      $location.search({
        q: query
      }).replace();
    });
    
    $scope.whereStr = encodeURI("where=" + where.join(" OR "));
  };

  $scope.newNode = function(type) {
    NodeList.save({
      graph: $scope.graph,
      type: type
    }, function(node) {
      $location.path('/graphs/' + node.type.graph.id + '/types/' + node.type.id + '/nodes/' + node.id + '/edit');
    }, function(error) {
      $scope.error = error;
    });
  };

})

.controller('NodeListByTypeCtrl', function($scope, $route, $location, $routeParams, $translate, Graph, Type, TypeNodeTreeList, TypeNodeCount, TypeList, NodeList, Node) {
  $scope.lang = $translate.use();

  $scope.query = ($location.search()).q || "";
  $scope.criteria = ($location.search()).c || "";
  $scope.criteriaModel = [];

  $scope.max = 25;

  function parseCriteriaModel(type, criteria) {
    if (criteria.length === 0) {
      return [];
    }

    var criteriaModel = [];
    var attrIndex = type.referenceAttributes.reduce(function(map, attr) {
      map["r." + attr.id + ".id"] = attr;
      return map;
    }, {});
    attrIndex = type.textAttributes.reduce(function(map, attr) {
      map["p." + attr.id] = attr;
      return map;
    }, attrIndex);

    var clauses = criteria.split(" AND ");

    for (var i = 0; i < clauses.length; i++) {
      var innerClauses = clauses[i]
        .substring(1, clauses[i].length - 1)
        .split(" OR ");

      var filter = {
        attribute: null,
        values: [],
        type: null
      };

      for (var j = 0; j < innerClauses.length; j++) {

        var attrAndValue = innerClauses[j].split(":");

        filter.type = attrAndValue[0].split('.')[0];

        var attr = attrIndex[attrAndValue[0]];
        var value = attrAndValue[1];

        filter.attribute = attr;
        if (filter.type == 'r') {
          filter.values.push({
            type: attr.range,
            id: value
          });
        } else if (filter.type =='p') {
          //strip quotation marks
          filter.values.push({
            id: value.substring(1,value.length - 1),
            text: value.substring(1,value.length - 1)
          });
        }
      }

      criteriaModel.push(filter);
    }

    return criteriaModel;
  }

  function criteriaModelToString(criteriaModel) {
    var clauses = [];
    for (var i = 0; i < criteriaModel.length; i++) {
      var attribute = criteriaModel[i].attribute;
      var values = criteriaModel[i].values;
      var type = criteriaModel[i].type;

      var innerClauses = [];
      for (var j = 0; j < values.length; j++) {
        if (type == "r") {
          innerClauses.push(type +"." + attribute.id + ".id:" + values[j].id);
        } else if (type == "p"){
          innerClauses.push(type +"." + attribute.id + ":\"" + values[j].id +"\"");
        }
      }
      if (innerClauses.length > 0) {
        clauses.push("(" + innerClauses.join(" OR ") + ")");
      }
    }
    return clauses.join(" AND ");
  }

  $scope.$watch('criteriaModel', function(criteriaModel, oldCriteriaModel) {
    if (criteriaModel && criteriaModel.length > 0) {
      $scope.criteria = criteriaModelToString(criteriaModel);
      $scope.searchNodes($scope.query, $scope.criteria);
    } else if (criteriaModel.length === 0 && oldCriteriaModel.length > 0) {
      $scope.criteria = "";
      $scope.searchNodes($scope.query, $scope.criteria);
    }
  }, true);

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

  $scope.type = Type.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId
  }, function(type) {
    $scope.criteriaModel = parseCriteriaModel(type, $scope.criteria);
    $scope.searchNodes($scope.query, $scope.criteria);
  });

  $scope.types = TypeList.query({
    graphId: $routeParams.graphId
  });

  $scope.loadMoreResults = function() {
    $scope.max += 50;
    $scope.searchNodes(($location.search()).q || "", ($location.search()).c || "");
  };

  $scope.loadAllResults = function() {
    $scope.max = -1;
    $scope.searchNodes(($location.search()).q || "", ($location.search()).c || "");
  };

  $scope.searchNodes = function(query, criteria) {
    var where = "";

    var tokens = (query.match(/\S+/g) || []);
    if (tokens.length > 0) {
      var whereProperties = [];

      whereProperties.push("p.prefLabel." + $scope.lang + ":\"" + query + "\"^4");

      whereProperties.push(tokens.map(function(token) {
        return "p.prefLabel." + $scope.lang + ":" + token + "*^2";
      }).join(" AND "));

      $scope.type.textAttributes.slice(0, 10).forEach(function(textAttribute) {
        whereProperties.push(tokens.map(function(token) {
          return "p." + textAttribute.id + ":" + token + "*";
        }).join(" AND "));
      });

      where = whereProperties.join(" OR ");
    }

    if (criteria.length > 0) {
      if (where.length > 0) {
        where = "(" + where + ") AND (" + criteria + ")";
      } else {
        where = criteria;
      }
    }

    TypeNodeCount.get({
      graphId: $routeParams.graphId,
      typeId: $routeParams.typeId,
      where: where
    }, function(result) {
      $scope.count = result.count;
    });

    TypeNodeTreeList.query({
      graphId: $routeParams.graphId,
      typeId: $routeParams.typeId,
      select: 'id,code,uri,type,p.*,r.*',
      where: where,
      max: $scope.max,
      sort: query ? '' : 'properties.prefLabel.' + $scope.lang + '.sortable'
    }, function(nodes) {
      $scope.nodes = nodes;
      $location.search({
        q: query,
        c: criteria
      }).replace();
    });
    
    $scope.whereStr = encodeURI("where=" + where);
  };

  $scope.addRefCriteria = function(attr) {
    $scope.criteriaModel.push({
      attribute: attr,
      values: [],
      type: "r"
    });
  };

  $scope.addTextCriteria = function(attr) {
    $scope.criteriaModel.push({
      attribute: attr,
      values: [],
      type: "p"
    });
  };

  $scope.removeCriteria = function(criteria) {
    var i = $scope.criteriaModel.indexOf(criteria);
    $scope.criteriaModel.splice(i, 1);
  };

  $scope.uploadCSVForSend = function(e) {
    switch(e.currentTarget.id) {
      case "translationsCsv":
        var inputFile = document.getElementById('file-upload');
        inputFile.value = '';
        var csvInfo = document.getElementById('csvInfo');
        csvInfo.innerHTML = "";
        document.getElementById("warningsArea").style.display = 'none'  
      break;
      default:
        console.log('Target not found', e.currentTarget.id);
    }
  };



  $scope.checkCSV = function() {

    const fileInput = document.getElementById('file-upload');
    var file = fileInput.files[0];
    if (fileInput.files.length == 0) {
      return;
    }

    $translate.use();
    this.className = '';

 
    var csvInfo = document.getElementById('csvInfo');
    csvInfo.innerHTML = "";

    var template = "";
    var csvData = null;

    var reader = new FileReader();    
    reader.readAsText(file);
    reader.onloadend = () => {

      template = reader.result;
      csvData = template;
      
      var text = template;
      var lines = text.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks

      const headerRow = [];
      // Download file as UTF-8, so it will work in every OS
      // So we need to add UTF-8 marks (\ufeff) to the file beginning  

      const validRows = new Map();
      const invalidRows = new Map();
      
      var totalRowsInFile = 0;

      for(var i = 0; i < lines.length; i++) {

        if (headerRow.length == 0 && lines[i].endsWith('type.graph.id')) {

          const myArray = lines[i].split(";");

          myArray.forEach(field => {
            // console.log(field, csvData[field]);
            if (headerRow.length == 0) {
              headerRow.push("\ufeff"+field);
            } else {
              headerRow.push(field);
            }
            
          }
          );
        } else
          if (headerRow.length > 0) {

            const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}[\r\n]*$/;

            var id = lines[i].substring(0, lines[i].indexOf(";"));         
            var graphId = lines[i].substring(lines[i].lastIndexOf(";") + 1);

            id = id.replace(/[^\x00-\x7F]/, "");
            graphId = graphId.replace(/[^\x00-\x7F]/, "");   
            
            if(regexExp.test(id) == false || regexExp.test(graphId) == false) {
              invalidRows.set((i + 1), $translate.instant('translationIdOrGraphIdMissing'));
            } else {
              validRows.set(id, lines[i]);
            }
         }
         totalRowsInFile = i;
      }
      var totalDiv = document.createElement('div');
      var invalidDiv = document.createElement('div');
      var updateDiv = document.createElement('div');

      totalDiv.textContent = $translate.instant('translationRowsTotal', {count: totalRowsInFile});;
      csvInfo.append(totalDiv);

      if (headerRow.length == 0){

        invalidDiv.textContent = $translate.instant('translationHeadersMissingOrNotUTF8');
        csvInfo.append(invalidDiv);
        document.getElementById("warningsArea").style.display = 'block'  
        document.getElementById("csvOk").style.display= 'none';
        document.getElementById("csvWarning").style.display= 'none';
        document.getElementById("csvError").style.display= 'block';

      } else
      if (validRows.size == 0){

        invalidDiv.textContent = $translate.instant('translationRowsMissing');
        csvInfo.append(invalidDiv);
        document.getElementById("warningsArea").style.display = 'block'  
        document.getElementById("csvOk").style.display= 'none';
        document.getElementById("csvWarning").style.display= 'none';
        document.getElementById("csvError").style.display= 'block';
      } else
      if (invalidRows.size == 0) {
        
        invalidDiv.textContent = $translate.instant('translationCsvOK', {count: validRows.size});
        csvInfo.append(invalidDiv);
        document.getElementById("warningsArea").style.display = 'block'  
        document.getElementById("csvOk").style.display= 'block';
        document.getElementById("csvWarning").style.display= 'none';
        document.getElementById("csvError").style.display= 'none';

      }
      else {

        updateDiv.textContent = $translate.instant('translationRowsValid', {count: validRows.size});
        csvInfo.append(updateDiv);
        invalidDiv.textContent = $translate.instant('translationRowsInvalid', {count: invalidRows.size});
        csvInfo.append(invalidDiv);
        document.getElementById("warningsArea").style.display = 'block'  
        document.getElementById("csvOk").style.display= 'none';
        document.getElementById("csvWarning").style.display= 'block';
        document.getElementById("csvError").style.display= 'none';
        invalidRows.forEach((value, key) => {
          let invalidRow = document.createElement('div');
          invalidRow.textContent = $translate.instant('row') + ": " + key + ", "  + (value.length > 50 ? value.substring(0, 50) + "..." : value);
          csvInfo.appendChild(invalidRow);
        });


      }
    };
  }

  function validNodesToUpdate(headerRow, nodesToUpdate) {

    var columnAndValues = new Map();

    nodesToUpdate.forEach(function(value, key) {

      const valuesArray = value.split(";");
      var id = "";
      var graphId = "";

      headerRow.forEach(function(value, key) {
        
        var cleanValue = value.replace(/[^\x00-\x7F]/, "");
        columnAndValues.set(cleanValue, valuesArray[key]);

        if(cleanValue === 'id') {
          id = valuesArray[key].replace(/[^\x00-\x7F]/, "");
        }

        if(cleanValue === 'type.graph.id') {
          graphId = valuesArray[key].replace(/[^\x00-\x7F]/, "");
        }
      });

      // Don't waste time if id or graph id is missing
      if(id.length > 0 && graphId.length > 0){
        updateSingleNode(id, graphId, columnAndValues);
      } 
    })

    $('#translationsCsvModal').modal('hide');
    $('#successModal').modal('show');
  }


 
  function updateSingleNode(id, graphId, columnAndValues) {

    var nodeToUpdate = Node.get({
      graphId: graphId,
      typeId: 'Concept',
      id: id
    });

    nodeToUpdate.$promise.then(function(node) {

    columnAndValues.forEach(function(value, key) {

      if(value.length > 0) {
      
      if(key.startsWith('properties.')) {
        const field = key.split('.');

        if(node.properties[field[1]]){

          if (field[2] != 'fi') { // Don't touch finnish language
            var filteredLanguages = node.properties[field[1]].filter(text => text.lang != field[2]);
            node.properties[field[1]] = filteredLanguages;
            const rows = value.split('|').filter(row => row !== '');

            rows.forEach(row => {
              var addLanguage = {lang: field[2], value: row, regex: '(?s)^.*$'};
              if(row.length > 0) {
                node.properties[field[1]].push(addLanguage);
              }
            });

          }
        } else {

          if(value.length > 0) { // Not a previous translations so create it

            const rows = value.split('|').filter(row => row !== '');
            node.properties[field[1]] = [];

            rows.forEach(row => {
              var addLanguage = {lang: field[2], value: row, regex: '(?s)^.*$'};
              node.properties[field[1]].push(addLanguage);
            });

          }
        }
      }
    }
    });

      Node.query({
        graphId: graphId,
        typeId: 'Status',
        code: 'translate'
      }).$promise.then(function(statusNode) {
  
        const statusId = statusNode.filter(node => node.code=='translate');
        const statusWithOutTranslate = node.references.status.filter(status => status.id != statusId[0].id);
        const canBeTranslated = node.references.status.filter(status => status.id == statusId[0].id).length > 0;

        // Update only if status has been marked for translated
        if (canBeTranslated){
          node.references.status = statusWithOutTranslate
          node.$update({
            graphId: graphId,
            typeId: 'Concept',
            id: id
          }, function(error) {
            $scope.error = error;
          });
        } 

        return statusId;
      });
      
    });
  }

  $scope.uploadCsvFile = function() {
 
    const fileInput = document.getElementById('file-upload');
    if (fileInput.files.length == 0) {
      return;
    }

    $translate.use();
    var csvInfo = document.getElementById('csvInfo');
    csvInfo.innerHTML = "";

    this.className = '';
    var template = "";
    var csvData = null;    
    var file = fileInput.files[0];

    var reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = () => {

      template = reader.result;
      csvData = template;

      var text = template;
      var lines = text.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks

      const headerRow = [];

      // Download file as UTF-8, so it will work in every OS
      // So we need to add UTF-8 marks (\ufeff) to the file beginning  

      var i = 0; 

      const validRows = new Map();
      const invalidRows = new Map();

      for(i = 0; i < lines.length; i++) {

        if (headerRow.length == 0 && lines[i].endsWith('type.graph.id')) {
          const myArray = lines[i].split(";");

          myArray.forEach(field => {
              if (headerRow.length == 0) {
                headerRow.push('\ufeff' + field);
              } else {
                headerRow.push(field);
              }
            });

        } else
         if (headerRow.length > 0) {
          const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}[\r\n]*$/;

          var id = lines[i].substring(0, lines[i].indexOf(";"));
          var graphId = lines[i].substring(lines[i].lastIndexOf(";") + 1);

          graphId = graphId.replace(/[^\x00-\x7F]/, "");

          if(regexExp.test(id) == false || regexExp.test(graphId) == false) {
            invalidRows.set((i + 1), $translate.instant('translationIdOrGraphIdMissing'));
          } else {
            validRows.set(id, lines[i]);
          }
        }

      }

      if (headerRow.length > 0 && validRows.size > 0){
        validNodesToUpdate(headerRow, validRows);
      } else {
        var invalidDiv = document.createElement('div');
        invalidDiv.textContent = "Tiedostossa ei ole yhtään arvoriviä tai ne ovat virheellisiä.";
        csvInfo.append(invalidDiv);
        document.getElementById("warningsArea").style.display = 'block'  
        document.getElementById("csvOk").style.display= 'none';
        document.getElementById("csvWarning").style.display= 'none';
        document.getElementById("csvError").style.display= 'block';
      }

    };

  };

  $scope.newNode = function() {
    NodeList.save({
      graph: $scope.graph,
      type: $scope.type
    }, function(node) {
      $location.path('/graphs/' + node.type.graph.id + '/types/' + node.type.id + '/nodes/' + node.id + '/edit');
    }, function(error) {
      $scope.error = error;
    });
  };

})

.controller('NodeListAllCtrl', function($scope, $route, $location, $routeParams, $translate, Graph, TypeList, GraphNodeTreeList) {

  $scope.lang = $translate.use();

  var select = $routeParams.select || 'id,code,uri,type,properties.*,references.*';
  var where = $routeParams.where || '';
  var sort = $routeParams.sort || ('properties.prefLabel.' + $scope.lang + '.sortable');

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

  $scope.typesById = {};

  TypeList.query({
    graphId: $routeParams.graphId
  }, function(types) {
    for (var i = 0; i < types.length; i++) {
      $scope.typesById[types[i].id] = types[i];
    }
  });

  $scope.nodes = GraphNodeTreeList.query({
    graphId: $routeParams.graphId,
    select: select,
    where: where,
    sort: sort,
    max: -1
  });

})

.controller('NodeListSparqlCtrl', function($scope, $route, $location, $routeParams, $translate, Graph, NodeSparqlEndpoint) {

  $scope.lang = $translate.use();

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

  $scope.queryString =
    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT *\nWHERE {\n  ?s ?p ?o .\n}\nLIMIT 25";

  $scope.query = function() {
    $scope.running = true;
    NodeSparqlEndpoint.query({
      graphId: $routeParams.graphId
    }, $scope.queryString, function(results) {
      $scope.table = results.data;
      $scope.error = "";
      $scope.running = false;
    }, function(error) {
      $scope.error = error;
      $scope.running = false;
    });
  };

})

.controller('NodeCtrl', function($scope, $routeParams, $location, $translate, Node, NodePaths, NodeList, Type, Graph) {

  $scope.lang = $translate.use();

  $scope.node = Node.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId,
    id: $routeParams.id
  });

  $scope.type = Type.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId
  });

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });
  
})

.controller('NodeRevisionCtrl', function($scope, $routeParams, $location, $translate, $q, NodeRevision, Type, Graph) {

  $scope.lang = $translate.use();

  $scope.revision = $routeParams.number;

  $scope.node = NodeRevision.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId,
    id: $routeParams.id,
    number: $routeParams.number
  });

  $scope.type = Type.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId
  });

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

})

.controller('NodeEditCtrl', function($scope, $routeParams, $location, $translate, Node, Type, Graph) {

  $scope.lang = $translate.use();

  $scope.node = Node.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId,
    id: $routeParams.id
  });

  $scope.type = Type.get({
    graphId: $routeParams.graphId,
    typeId: $routeParams.typeId
  });

  $scope.graph = Graph.get({
    graphId: $routeParams.graphId
  });

  $scope.save = function() {
    $scope.node.$update({
      graphId: $routeParams.graphId,
      typeId: $routeParams.typeId,
      id: $routeParams.id
    }, function(node) {

      $location.path('/graphs/' + node.type.graph.id + '/types/' + node.type.id + '/nodes/' + node.id);
    }, function(error) {
      $scope.error = error;
    });
  };

  $scope.remove = function() {
    $scope.node.$delete({
      graphId: $routeParams.graphId,
      typeId: $routeParams.typeId,
      id: $routeParams.id
    },function() {
      $location.path('/graphs/' + $routeParams.graphId + '/nodes');
    }, function(error) {
      $scope.error = error;
    });
  };

})

.directive('thlNodeTree', function($rootScope, $location, $q, $translate) {
  return {
    scope: {
      node: '=',
      type: '='
    },
    link: function(scope, elem, attrs) {

      function propVal(props, propertyId, defaultValue) {
        if (props[propertyId] && props[propertyId].length > 0) {
          return props[propertyId][0].value;
        }
        return defaultValue;
      }

      var lang = $translate.use();

      $rootScope.$on('$translateChangeEnd', function() {
        lang = $translate.use();
        elem.jstree("refresh");
      });

      $q.all([scope.node.$promise, scope.type.$promise]).then(function() {

        var treeAttributeId = propVal(scope.type.properties, "configTreeAttributeId", "broader");
        var treeInverted = propVal(scope.type.properties, "configTreeInverted", "true");
        var treeSort = propVal(scope.type.properties, "configTreeSort", "true");

        elem.jstree({
          core: {
            themes: {
              variant: "small"
            },
            data: {
              url: function(node) {
                var nodeGraphId;
                var nodeTypeId;
                var nodeId;

                if (node.id === '#') {
                  nodeGraphId = scope.node.type.graph.id;
                  nodeTypeId = scope.node.type.id;
                  nodeId = scope.node.id;
                } else {
                  nodeGraphId = node.li_attr.nodeGraphId;
                  nodeTypeId = node.li_attr.nodeTypeId;
                  nodeId = node.li_attr.nodeId;
                }

                return 'api/graphs/' + nodeGraphId +
                       '/types/' + nodeTypeId +
                       '/nodes/' + nodeId +
                       '/trees' +
                       '?attributeId=' + treeAttributeId +
                       '&context=true' +
                       '&jstree=true' +
                       '&referrers=' + treeInverted +
                       '&lang=' + lang;
              },
              data: function(node) {
                return node;
              }
            }
          },
          sort: function(a, b) {
            var aNode = this.get_node(a).original;
            var bNode = this.get_node(b).original;
            return aNode.text.localeCompare(bNode.text, lang);
          },
          plugins: [treeSort == "true" ? "sort" : ""]
        });
      });

      elem.on('activate_node.jstree', function(e, data) {
        scope.$apply(function() {
          $location.path(data.node.a_attr.href);
        });
      });
    }
  };
});

})(window.angular);
