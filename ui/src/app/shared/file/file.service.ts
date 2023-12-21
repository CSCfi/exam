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
import type { HttpResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver-es';
import { ToastrService } from 'ngx-toastr';
import type { Attachment, EssayAnswer } from '../../exam/exam.model';

type Container = { attachment?: Attachment; objectVersion?: number };

@Injectable({ providedIn: 'root' })
export class FileService {
    maxFileSize = 0;
    constructor(private http: HttpClient, private translate: TranslateService, private toast: ToastrService) {}

    download(url: string, filename: string, params?: Record<string, string | string[]>, post?: boolean) {
        const method = post ? 'POST' : 'GET';
        this.http
            .request(method, url, {
                responseType: 'text',
                observe: 'response',
                params: method === 'GET' ? params : undefined,
                body: method === 'POST' ? { params } : undefined,
            })
            .subscribe({
                next: (resp: HttpResponse<string>) => {
                    if (resp.body) {
                        const contentType = resp.headers.get('Content-Type');
                        if (contentType) {
                            this.saveFile(resp.body, filename, contentType.split(';')[0]);
                        }
                    }
                },
                error: (resp) => {
                    console.log('error ' + JSON.stringify(resp));
                    this.toast.error(resp.body || resp);
                },
            });
    }

    getMaxFilesize(): Promise<{ filesize: number }> {
        return new Promise((resolve, reject) => {
            if (this.maxFileSize) {
                resolve({ filesize: this.maxFileSize });
            } else {
                this.http.get<{ filesize: number }>('/app/settings/maxfilesize').subscribe({
                    next: (resp) => {
                        this.maxFileSize = resp.filesize;
                        resolve(resp);
                    },
                    error: reject,
                });
            }
        });
    }

    upload(url: string, file: File, params: Record<string, string>, parent?: Container, callback?: () => void): void {
        this.doUpload(url, file, params)
            .then((resp) => {
                if (parent) {
                    parent.attachment = resp as Attachment;
                }
                if (callback) {
                    callback();
                }
            })
            .catch((resp) => this.toast.error(this.translate.instant(resp.data)));
    }

    uploadAnswerAttachment(url: string, file: File, params: Record<string, string>, parent: Container): void {
        this.doUpload(url, file, params)
            .then((resp) => {
                parent.objectVersion = resp.objectVersion;
                parent.attachment = !this.isAttachment(resp) ? resp.attachment : resp;
            })
            .catch((resp) => this.toast.error(this.translate.instant(resp.data)));
    }

    private isAttachment = (obj: EssayAnswer | Attachment): obj is Attachment => obj.objectVersion === undefined;

    private saveFile(data: string, fileName: string, contentType: string) {
        let blob: Blob;
        try {
            const byteString = window.atob(data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ia], { type: contentType });
        } catch (e) {
            // Maybe this isn't base64, try plaintext approaches
            const text = contentType === 'application/json' ? JSON.stringify(data, null, 2) : data;
            blob = new Blob([text], { type: contentType });
        }
        saveAs(blob, fileName, { autoBom: false });
    }

    private isFileTooBig(file: File): boolean {
        if (file.size > this.maxFileSize) {
            this.toast.error(this.translate.instant('i18n_file_too_large'));
            return true;
        }
        return false;
    }

    private doUpload(url: string, file: File, params: Record<string, string>): Promise<Attachment | EssayAnswer> {
        return new Promise<Attachment | EssayAnswer>((resolve, reject) => {
            if (this.isFileTooBig(file)) {
                reject({ data: 'i18n_file_too_large' });
            } else {
                const fd = new FormData();
                fd.append('file', file);
                for (const k in params) {
                    if (Object.prototype.hasOwnProperty.call(params, k)) {
                        fd.append(k, params[k]);
                    }
                }
                this.http.post<Attachment>(url, fd).subscribe({
                    next: (resp) => resolve(resp),
                    error: (resp) => reject(resp),
                });
            }
        });
    }
}
