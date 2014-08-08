(function() {
    'use strict';
    angular.module('sitnet.services')
        .factory('dateService', function () {
            return {};
        });
}());


(function() {
    'use strict';
    angular.module('sitnet.services')
        .service('fileUpload', ['$http', function ($http) {
            this.uploadAttachment = function(file, url){
                var fd = new FormData();
                fd.append('file', file);
                $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                })
                    .success(function(){
                    })
                    .error(function(){
                    });
            }
        }]);
}());
