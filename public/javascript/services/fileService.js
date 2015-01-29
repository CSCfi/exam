(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('fileService', ['$http', function ($http) {

                var saveFile = function(data, filename) {
                    var byteString = atob(data);
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    var blob = new Blob([ia], {type: "application/octet-stream"});
                    saveAs(blob, filename);
                };

                var download = function(url, filename) {
                    $http.get(url, {responseType: 'arrayBuffer'}).
                        success(function (data) {
                            saveFile(data, filename);
                        }).
                        error(function (error) {
                            toastr(error.data);
                        });
                };

            return { download: download };
        }]);
}());

