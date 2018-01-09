/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';
import toast from 'toastr';
import FileSaver from 'filesaver.js';

angular.module('app.utility')
    .factory('Files', ['$q', '$http', '$translate', '$timeout', 'SettingsResource',
        function ($q, $http, $translate, $timeout, SettingsResource) {
            let _supportsBlobUrls;
            let _maxFileSize;

            const svg = new Blob(
                ['<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>'],
                {type: 'image/svg+xml;charset=utf-8'}
            );
            const img = new Image();
            img.onload = function () {
                _supportsBlobUrls = true;
            };
            img.onerror = function () {
                _supportsBlobUrls = false;
            };
            img.src = URL.createObjectURL(svg);

            const saveFile = function (data, fileName, contentType) {
                if (!_supportsBlobUrls) {
                    window.open('data:' + contentType + ';base64,' + data);
                } else {
                    const byteString = atob(data);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ia], {type: contentType});
                    FileSaver.saveAs(blob, fileName);
                }
            };

            const download = function (url, filename, params, post) {
                const res = post ? $http.post : $http.get;
                res(url, {params: params}).then(function (resp) {
                    const contentType = resp.headers()['content-type'].split(';')[0];
                    saveFile(resp.data, filename, contentType);
                }).catch(function (resp) {
                    toast.error(resp.data || resp);
                });
            };

            const open = function (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const f = reader.result;
                    window.open(f);
                };
                reader.readAsDataURL(file);
            };

            const getMaxFilesize = function () {
                const deferred = $q.defer();

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

            const isFileTooBig = function (file) {
                if (file.size > _maxFileSize) {
                    toast.error($translate.instant('sitnet_file_too_large'));
                    return true;
                }
                return false;
            };

            const doUpload = function (url, file, params, parent, modal, callback) {
                if (isFileTooBig(file)) {
                    return;
                }
                const fd = new FormData();
                fd.append('file', file);
                for (let k in params) {
                    if (params.hasOwnProperty(k)) {
                        fd.append(k, params[k]);
                    }
                }

                $http.post(url, fd, {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                })
                    .then(callback)
                    .catch(function (resp) {
                        if (modal) {
                            modal.dismiss();
                        }
                        toast.error(resp.data);
                    });
            };

            const upload = function (url, file, params, parent, modal, callback) {
                doUpload(url, file, params, parent, modal, function (attachment) {
                    if (modal) {
                        modal.dismiss();
                    }
                    if (parent) {
                        parent.attachment = attachment;
                    }
                    if (callback) {
                        callback();
                    }
                });
            };

            const uploadAnswerAttachment = function (url, file, params, parent, modal) {
                doUpload(url, file, params, parent, modal, function (answer) {
                    if (modal) {
                        modal.dismiss();
                    }
                    parent.objectVersion = answer.objectVersion;
                    parent.attachment = answer.attachment;
                });
            };

            return {
                download: download,
                upload: upload,
                uploadAnswerAttachment: uploadAnswerAttachment,
                getMaxFilesize: getMaxFilesize,
                open: open
            };
        }]);


