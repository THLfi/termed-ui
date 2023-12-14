(function(angular) {
  'use strict';

  angular.module('termed.nodes.upload', ['termed.rest'])
  
  .controller('filetypeController', ['$scope', function($scope) {
    $scope.utf8 = { label: 'UTF-8'};
    $scope.excel = { label: 'Excel, ISO-8859-1'};
  }])
  
  .directive('uploadCsv', function($translate, $timeout, TypeNodeImportCsv) {
    return {
      restrict: 'A',
      scope: {
        graph : '=',
        type : '=',
        filetype: '=filetype' 
      },
      templateUrl: 'app/nodes/upload/upload-csv.html',
      link : function(scope, elem, attrs) {

        var buttonElem = elem.find('a');
        var inputElem = elem.find('input');
        
        buttonElem.on('click', function() {
          inputElem.click();
        });
        
        inputElem.on('change', function() {
          var file = inputElem[0].files[0];
          var reader = new FileReader();
                  
          reader.onload = function(event) {
            var data = new Uint8Array(event.target.result);
            var params = {};
            switch(attrs.filetype) {
              case 'utf8':
                params = {
                  graphId: scope.graph.id,
                  typeId: scope.type.id,
                  delimiter: 'COMMA',
                  lineBreak: 'LF',
                  quoteAll: 'false',
                  charset: 'UTF-8'
                };
                break;
              case 'excel':              
                params = {
                  graphId: scope.graph.id,
                  typeId: scope.type.id,
                  delimiter: 'SEMICOLON',
                  lineBreak: 'CRLF',
                  quoteAll: 'true',
                  charset: 'ISO-8859-1'
                };
                break;
              default:
                params = {
                  graphId: scope.graph.id,
                  typeId: scope.type.id,
                  delimiter: 'COMMA',
                  lineBreak: 'LF',
                  quoteAll: 'false',
                  charset: 'UTF-8'
                };
            }
            TypeNodeImportCsv.save(params, data, function(response, headers) {
              $timeout(function(){
                scope.$emit('upload-success', 'Upload successful');
              });
            },function(error) {
              scope.$emit('upload-error', error);
            });
          };
          
          reader.readAsArrayBuffer(file);
        });
      }
    };
  });
  
})(window.angular);
