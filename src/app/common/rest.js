(function (angular) { 'use strict';

angular.module('termed.rest', ['ngResource'])

.factory('GraphList', function($resource) {
  return $resource('api/graphs');
})

.factory('Graph', function($resource) {
  return $resource('api/graphs/:graphId');
})

.factory('TypeList', function($resource) {
  return $resource('api/graphs/:graphId/types', null, { 'replace': { method : 'PUT' }});
})

.factory('Type', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId');
})

.factory('TextAttributeList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/textAttributes');
})

.factory('ReferenceAttributeList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/referenceAttributes');
})

.factory('NodeList', function($resource) {
  return $resource('api/nodes');
})

.factory('NodeTreeList', function($resource) {
  return $resource('api/node-trees');
})

.factory('GraphNodeList', function($resource) {
  return $resource('api/graphs/:graphId/nodes');
})

.factory('GraphNodeTreeList', function($resource) {
  return $resource('api/graphs/:graphId/node-trees');
})

.factory('GraphNodeCount', function($resource) {
  return $resource('api/graphs/:graphId/node-count', null, {
    'get': {
      method: 'GET',
      transformResponse: function(data) {
        return { count: data };
      }
    }
  });
})

.factory('TypeNodeList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes');
})

.factory('TypeNodeTreeList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/node-trees');
})

.factory('TypeNodeCount', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/node-count', null, {
    'get': {
      method: 'GET',
      transformResponse: function(data) {
        return { count: data };
      }
    }
  });
})

.factory('TypeNodeImportCsv', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes:params', {graphId: '@graphId', typeId: '@typeId', delimiter: '@delimiter', lineBrak: '@linebreak', quoteAll : '@quoteAll', charset : '@charset'}, {
    'save': {
      method : 'POST',
      headers: {'Content-Type': 'text/csv'},
      transformRequest: [],
      transformResponse: []
    }
  });
})

.factory('Node', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id', null, { 'update': { method : 'PUT' }});
})

.factory('NodeRevision', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/revisions/:number', null, {
    'get': {
      method: 'GET',
      transformResponse: function(data) {
        return angular.fromJson(data).object;
      }
    }
  });
})

.factory('NodeReferenceList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/references/:attributeId');
})

.factory('NodeReferrerList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/referrers/:attributeId');
})

.factory('NodeTrees', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/trees/:attributeId');
})

.factory('NodePaths', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/paths/:attributeId');
})

.factory('NodeRevisionList', function($resource) {
  return $resource('api/graphs/:graphId/types/:typeId/nodes/:id/revisions');
})

.factory('NodeSparqlEndpoint', function($resource) {
  return $resource('api/graphs/:graphId/nodes/sparql', {}, {
    'query': {
      method: 'POST',
      headers: {
        'Content-type': 'text/plain',
        'Accept': 'text/csv'
      },
      transformResponse: function(data) {
        return Papa.parse(data);
      }
    }
  });
})

.factory('PropertyList', function($resource) {
  return $resource('api/properties');
})

.factory('UserList', function($resource) {
  return $resource('api/users');
})

.factory('GraphDump', function($resource) {
  return $resource('api/graphs/:graphId/dump');
})

.factory('Dump', function($resource) {
  return $resource('api/dump');
});

})(window.angular);
