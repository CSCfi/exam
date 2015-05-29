(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('fileService', ['$http', function ($http) {

            var supportsBlobUrls;

            var svg = new Blob(
                ["<svg xmlns='http://www.w3.org/2000/svg'></svg>"],
                {type: "image/svg+xml;charset=utf-8"}
            );
            var img = new Image();
            img.onload = function () {
                supportsBlobUrls = true
            };
            img.onerror = function () {
                supportsBlobUrls = false
            };
            img.src = URL.createObjectURL(svg);

            var saveFile = function (data, filename) {
                if (!supportsBlobUrls) {
                    window.open('data:application/octet-stream;base64,' + data);
                } else {
                    var byteString = atob(data);
                    var ab = new ArrayBuffer(byteString.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    var blob = new Blob([ia], {type: "application/octet-stream"});
                    saveAs(blob, filename);
                }
            };

            var download = function (url, filename, params) {
                $http.get(url, {params: params}).
                    success(function (data) {
                        saveFile(data, filename);
                    }).
                    error(function (error) {
                        toastr.error(error.data || error);
                    });
            };

            return {download: download};
        }]);
}());

