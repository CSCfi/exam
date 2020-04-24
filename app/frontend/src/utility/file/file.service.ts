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
import { IDeferred, IHttpResponse, IPromise } from 'angular';
import * as toast from 'toastr';
import * as FileSaver from 'file-saver';

export class FileService {
    private maxFileSize: number;

    constructor(
        private $q: angular.IQService,
        private $http: angular.IHttpService,
        private $translate: angular.translate.ITranslateService,
        private $timeout: angular.ITimeoutService,
    ) {
        'ngInject';
    }

    download(url: string, filename: string, params?: any, post?: boolean) {
        const cb = (resp: IHttpResponse<string>) => {
            const contentType = resp.headers()['content-type'].split(';')[0];
            this.saveFile(resp.data, filename, contentType);
        };
        const errCb = resp => toast.error(resp.data || resp);
        if (post) {
            this.$http
                .post(url, { params: params })
                .then(cb)
                .catch(errCb);
        } else {
            this.$http
                .get(url)
                .then(cb)
                .catch(errCb);
        }
    }

    getMaxFilesize(): IPromise<{ filesize: number }> {
        const deferred: IDeferred<{ filesize: number }> = this.$q.defer();
        if (this.maxFileSize) {
            this.$timeout(() => deferred.resolve({ filesize: this.maxFileSize }), 10);
        }
        this.$http
            .get('/app/settings/maxfilesize')
            .then((resp: IHttpResponse<{ filesize: number }>) => {
                this.maxFileSize = resp.data.filesize;
                return deferred.resolve(resp.data);
            })
            .catch(e => deferred.reject(e));
        return deferred.promise;
    }

    upload(url: string, file: File, params: any, parent: any, callback?: () => void): void {
        this.doUpload(url, file, params)
            .then(resp => {
                if (parent) {
                    parent.attachment = resp.data;
                }
                if (callback) {
                    callback();
                }
            })
            .catch(resp => toast.error(this.$translate.instant(resp.data)));
    }

    private doUpload(url: string, file: File, params: any): IPromise<any> {
        const deferred = this.$q.defer();
        if (this.isFileTooBig(file)) {
            this.$timeout(() => deferred.reject({ data: 'sitnet_file_too_large' }), 10);
        }
        const fd = new FormData();
        fd.append('file', file);
        for (const k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) {
                fd.append(k, params[k]);
            }
        }

        this.$http
            .post(url, fd, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined },
            })
            .then(resp => deferred.resolve(resp))
            .catch(resp => deferred.reject(resp));
        return deferred.promise;
    }

    uploadAnswerAttachment(url: string, file: File, params: any, parent: any): void {
        this.doUpload(url, file, params)
            .then(resp => {
                parent.objectVersion = resp.data.objectVersion;
                parent.attachment = resp.data.attachment ? resp.data.attachment : resp.data;
            })
            .catch(resp => toast.error(this.$translate.instant(resp.data)));
    }

    private saveFile(data: string, fileName: string, contentType: string) {
        let blob: Blob;
        try {
            const byteString = atob(data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ia], { type: contentType });
        } catch (e) {
            // Maybe this isn't base64, try plaintext approaches
            let text: string;
            if (contentType === 'application/json') {
                text = JSON.stringify(data, null, 2);
            } else {
                text = data;
            }
            blob = new Blob([text], { type: contentType });
        }
        FileSaver.saveAs(blob, fileName);
    }

    private isFileTooBig(file: File): boolean {
        if (file.size > this.maxFileSize) {
            toast.error(this.$translate.instant('sitnet_file_too_large'));
            return true;
        }
        return false;
    }
}
