// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver-es';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EssayAnswer } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

type Container = { attachment?: Attachment; objectVersion?: number };

@Injectable({ providedIn: 'root' })
export class FileService {
    maxFileSize = 0;
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private errorHandler: ErrorHandlingService,
    ) {}

    download(
        url: string,
        filename: string,
        params?: Record<string, string | string[]>,
        post?: boolean,
    ): Observable<void> {
        const method = post ? 'POST' : 'GET';
        return this.http
            .request(method, url, {
                responseType: 'text',
                observe: 'response',
                params: method === 'GET' ? params : undefined,
                body: method === 'POST' ? { params } : undefined,
            })
            .pipe(
                tap((resp: HttpResponse<string>) => {
                    if (resp.body) {
                        const contentType = resp.headers.get('Content-Type');
                        if (contentType) {
                            this.saveFile(resp.body, filename, contentType.split(';')[0]);
                        }
                    }
                }),
                map(() => void 0),
                catchError((error) => this.errorHandler.handle(error, 'FileService.download')),
            );
    }

    getMaxFilesize$(): Observable<{ filesize: number }> {
        if (this.maxFileSize) {
            return of({ filesize: this.maxFileSize });
        }
        return this.http.get<{ filesize: number }>('/app/settings/maxfilesize').pipe(
            tap((resp) => {
                this.maxFileSize = resp.filesize;
            }),
            catchError((error) => this.errorHandler.handle(error, 'FileService.getMaxFilesize$')),
        );
    }

    upload$(
        url: string,
        file: File,
        params: Record<string, string>,
        parent?: Container,
    ): Observable<Attachment | EssayAnswer> {
        if (this.isFileTooBig(file)) {
            return throwError(() => new Error(this.translate.instant('i18n_file_too_large')));
        }

        const fd = new FormData();
        fd.append('file', file);
        for (const k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) {
                fd.append(k, params[k]);
            }
        }

        return this.http.post<Attachment | EssayAnswer>(url, fd).pipe(
            tap((resp) => {
                if (parent) {
                    if (this.isAttachment(resp)) {
                        parent.attachment = resp;
                    } else {
                        parent.objectVersion = resp.objectVersion;
                        parent.attachment = resp.attachment;
                    }
                }
            }),
            catchError((error) => this.errorHandler.handle(error, 'FileService.upload$')),
        );
    }

    uploadAnswerAttachment$(
        url: string,
        file: File,
        params: Record<string, string>,
        parent: Container,
    ): Observable<Attachment | EssayAnswer> {
        return this.upload$(url, file, params, parent).pipe(
            tap((resp) => {
                if (this.isAttachment(resp)) {
                    parent.attachment = resp;
                } else {
                    parent.objectVersion = resp.objectVersion;
                    parent.attachment = resp.attachment;
                }
            }),
            catchError((error) => this.errorHandler.handle(error, 'FileService.uploadAnswerAttachment$')),
        );
    }

    private isAttachment = (obj: EssayAnswer | Attachment): obj is Attachment => obj.objectVersion === undefined;

    private saveFile(data: string, fileName: string, contentType: string): void {
        let blob: Blob;
        try {
            const byteString = window.atob(data);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ia], { type: contentType });
        } catch {
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
}
