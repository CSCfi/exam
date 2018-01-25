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

import * as angular from 'angular';
import * as toast from 'toastr';
import * as FileSaver from 'file-saver';
import { IDeferred, IHttpResponse, IPromise } from 'angular';

export class FileService {

    private _supportsBlobUrls: boolean;
    private _maxFileSize: number;

    /* @ngInject */
    constructor(
        private $q: angular.IQService,
        private $http: angular.IHttpService,
        private $translate: angular.translate.ITranslateService,
        private $timeout: angular.ITimeoutService,
        private $window: angular.IWindowService) {

        const svg = new Blob(
            ['<svg xmlns=\'http://www.w3.org/2000/svg\'></svg>'],
            { type: 'image/svg+xml;charset=utf-8' }
        );
        const img = new Image();
        img.onload = () => this._supportsBlobUrls = true;
        img.onerror = () => this._supportsBlobUrls = false;
        img.src = URL.createObjectURL(svg);
    }

    download(url: string, filename: string, params?: any, post?: boolean) {
        const res = post ? this.$http.post : this.$http.get;
        res(url, { params: params })
            .then((resp: IHttpResponse<string>) => {
                const contentType = resp.headers()['content-type'].split(';')[0];
                this._saveFile(resp.data, filename, contentType);
            })
            .catch(resp => toast.error(resp.data || resp));
    }

    open(file: Blob) {
        const reader = new FileReader();
        reader.onload = () => {
            const f = reader.result;
            this.$window.open(f);
        };
        reader.readAsDataURL(file);
    }

    getMaxFilesize(): IPromise<{ filesize: number }> {
        const deferred: IDeferred<{ filesize: number }> = this.$q.defer();
        if (this._maxFileSize) {
            this.$timeout(() => deferred.resolve({ 'filesize': this._maxFileSize }), 10);
        }
        this.$http.get('/app/settings/maxfilesize')
            .then((resp: IHttpResponse<{ filesize: number }>) => {
                this._maxFileSize = resp.data.filesize;
                return deferred.resolve(resp.data);
            }).catch(e => deferred.reject(e));
        return deferred.promise;
    }

    upload(url: string, file: File, params: any, parent: any, callback: () => void): void {
        this._doUpload(url, file, params)
            .then(resp => {
                if (parent) {
                    parent.attachment = resp.data;
                }
                if (callback) {
                    callback();
                }
            }).catch(resp =>
                toast.error(this.$translate.instant(resp.data))
            );
    }

    uploadAnswerAttachment(url: string, file: File, params: any, parent: any): void {
        this._doUpload(url, file, params)
            .then(resp => {
                parent.objectVersion = resp.data.objectVersion;
                parent.attachment = resp.data.attachment;
            })
            .catch(resp =>
                toast.error(this.$translate.instant(resp.data))
            );
    }

    private _saveFile(data: string, fileName: string, contentType: string) {
        if (!this._supportsBlobUrls) {
            this.$window.open('data:' + contentType + ';base64,' + data);
        } else {
            const byteString = atob(data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ia], { type: contentType });
            FileSaver.saveAs(blob, fileName);
        }
    }

    private _isFileTooBig(file: File): boolean {
        if (file.size > this._maxFileSize) {
            toast.error(this.$translate.instant('sitnet_file_too_large'));
            return true;
        }
        return false;
    }

    private _doUpload(url: string, file: File, params: any): IPromise<any> {
        const deferred = this.$q.defer();
        if (this._isFileTooBig(file)) {
            this.$timeout(() => deferred.reject({ data: 'sitnet_file_too_large' }), 10);
        }
        const fd = new FormData();
        fd.append('file', file);
        for (let k in params) {
            if (params.hasOwnProperty(k)) {
                fd.append(k, params[k]);
            }
        }

        this.$http.post(url, fd, {
            transformRequest: angular.identity,
            headers: { 'Content-Type': undefined }
        }).then(resp => deferred.resolve(resp))
            .catch(resp => deferred.reject(resp));
        return deferred.promise;
    }

}
