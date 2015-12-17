(function () {
    'use strict';
    angular.module('exam.services')
        .factory('fileService', ['$q', '$http', '$translate', '$timeout', '$cookies', 'SettingsResource',
            function ($q, $http, $translate, $timeout, $cookies, SettingsResource) {
                var _supportsBlobUrls;
                var _maxFileSize;

                var svg = new Blob(
                    ["<svg xmlns='http://www.w3.org/2000/svg'></svg>"],
                    {type: "image/svg+xml;charset=utf-8"}
                );
                var img = new Image();
                img.onload = function () {
                    _supportsBlobUrls = true
                };
                img.onerror = function () {
                    _supportsBlobUrls = false
                };
                img.src = URL.createObjectURL(svg);

                var saveFile = function (data, filename) {
                    if (!_supportsBlobUrls) {
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

                var getMaxFilesize = function () {
                    var deferred = $q.defer();

                    if (_maxFileSize) {
                        $timeout(function () {
                            return deferred.resolve({'filesize': _maxFileSize});
                        }, 10);
                    }
                    SettingsResource.maxFilesize.get(function (data) {
                        _maxFileSize = data.filesize;
                        return deferred.resolve(data);
                    }, function (error) {
                        return deferred.reject(error);
                    });
                    return deferred.promise;
                };

                var doUpload = function (url, file, params, parent, modal, callback) {
                    if (file.size > _maxFileSize) {
                        toastr.error($translate.instant('sitnet_file_too_large'));
                        return;
                    }
                    var fd = new FormData();
                    fd.append('file', file);
                    for (var k in params) {
                        if (params.hasOwnProperty(k)) {
                            fd.append(k, params[k]);
                        }
                    }
                    var csrfToken = $cookies.get('csrfToken');
                    console.log('xsrf token: ' + csrfToken);
                    $http.post(url + "?csrfToken=" + csrfToken, fd, {
                            transformRequest: angular.identity,
                            headers: {'Content-Type': undefined}
                        })
                        .success(callback)
                        .error(function (error) {
                            modal.dismiss();
                            toastr.error(error);
                        });
                };

                var upload = function (url, file, params, parent, modal) {
                    doUpload(url, file, params, parent, modal, function (attachment) {
                        modal.dismiss();
                        parent.attachment = attachment;
                    });
                };

                var uploadAnswerAttachment = function (url, file, params, parent, modal) {
                    doUpload(url, file, params, parent, modal, function (answer) {
                        modal.dismiss();
                        parent.objectVersion = answer.objectVersion;
                        parent.attachment = answer.attachment;
                    });
                };

                return {
                    download: download,
                    upload: upload,
                    uploadAnswerAttachment: uploadAnswerAttachment,
                    getMaxFilesize: getMaxFilesize
                };
            }]);
}());

