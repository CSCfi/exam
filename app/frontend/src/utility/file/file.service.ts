/*
 * Copyright (c) 2018 Exam Consortium
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
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as FileSaver from 'file-saver';
import * as toast from 'toastr';

import { Attachment } from '../../exam/exam.model';

@Injectable()
export class FileService {
    maxFileSize: number;
    constructor(private http: HttpClient, private translate: TranslateService) {}

    download(url: string, filename: string, params?: any, post?: boolean) {
        const method = post ? 'POST' : 'GET';
        this.http.request(method, url, { responseType: 'text', observe: 'response', params: params }).subscribe(
            (resp: HttpResponse<string>) => {
                if (resp.body) {
                    const contentType = resp.headers.get('Content-Type');
                    if (contentType) {
                        this.saveFile(resp.body, filename, contentType.split(';')[0]);
                    }
                }
            },
            resp => {
                console.log('error ' + JSON.stringify(resp));
                toast.error(resp.body || resp);
            },
        );
    }

    getMaxFilesize(): Promise<{ filesize: number }> {
        return new Promise((resolve, reject) => {
            if (this.maxFileSize) {
                resolve({ filesize: this.maxFileSize });
            } else {
                this.http.get<{ filesize: number }>('/app/settings/maxfilesize').subscribe(
                    resp => {
                        this.maxFileSize = resp.filesize;
                        resolve(resp);
                    },
                    e => reject(e),
                );
            }
        });
    }

    upload(url: string, file: File, params: any, parent: any, callback?: () => void): void {
        this.doUpload(url, file, params)
            .then(resp => {
                if (parent) {
                    parent.attachment = resp;
                }
                if (callback) {
                    callback();
                }
            })
            .catch(resp => toast.error(this.translate.instant(resp.data)));
    }

    uploadAnswerAttachment(url: string, file: File, params: any, parent: any): void {
        this.doUpload(url, file, params)
            .then(resp => {
                parent.objectVersion = resp.objectVersion; // FIXME: CSCEXAM-266 fixed in master, won't work here (ts)
                parent.attachment = resp;
            })
            .catch(resp => toast.error(this.translate.instant(resp.data)));
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
            let text;
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
            toast.error(this.translate.instant('sitnet_file_too_large'));
            return true;
        }
        return false;
    }

    private doUpload(url: string, file: File, params: any): Promise<Attachment> {
        return new Promise<Attachment>((resolve, reject) => {
            if (this.isFileTooBig(file)) {
                reject({ data: 'sitnet_file_too_large' });
            } else {
                const fd = new FormData();
                fd.append('file', file);
                for (const k in params) {
                    if (Object.prototype.hasOwnProperty.call(params, k)) {
                        fd.append(k, params[k]);
                    }
                }
                this.http.post<Attachment>(url, fd).subscribe(
                    resp => resolve(resp),
                    resp => reject(resp),
                );
            }
        });
    }
}
