// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver-es';
import { ToastrService } from 'ngx-toastr';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { EssayAnswer } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';

type Container = { attachment?: Attachment; objectVersion?: number };

@Injectable({ providedIn: 'root' })
export class FileService {
    maxFileSize = 0;

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    download(
        url: string,
        filename: string,
        params?: Record<string, string | string[] | number | number[] | boolean | boolean[] | (string | number)[]>,
        post?: boolean,
    ) {
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

    getMaxFilesize$() {
        if (this.maxFileSize) {
            return of({ filesize: this.maxFileSize });
        }
        return this.http
            .get<{ filesize: number }>('/app/settings/maxfilesize')
            .pipe(tap((resp) => (this.maxFileSize = resp.filesize)));
    }

    upload$ = <A>(url: string, file: File, params: Record<string, string>): Observable<A> =>
        this.doUpload$<A>(url, file, params).pipe(
            catchError((resp: unknown) => {
                if (resp && typeof resp === 'object' && 'data' in resp) {
                    this.toast.error(this.translate.instant((resp as { data: string }).data));
                }
                return throwError(() => resp);
            }),
        );

    uploadAnswerAttachment(url: string, file: File, params: Record<string, string>, parent: Container): void {
        this.doUpload$<EssayAnswer>(url, file, params).subscribe({
            next: (resp) => {
                parent.objectVersion = resp.objectVersion;
                parent.attachment = !this.isAttachment(resp) ? resp.attachment : resp;
            },
            error: (resp) => this.toast.error(this.translate.instant(resp.error.data)),
        });
    }

    private isAttachment = (obj: EssayAnswer | Attachment): obj is Attachment => obj.objectVersion === undefined;

    private saveFile(data: string, fileName: string, contentType: string) {
        try {
            const binary = atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: contentType });
            saveAs(blob, fileName, { autoBom: false });
        } catch {
            // Fallback for non-base64 data
            const text = contentType === 'application/json' ? JSON.stringify(data, null, 2) : data;
            saveAs(new Blob([text], { type: contentType }), fileName, { autoBom: false });
        }
    }

    private doUpload$ = <A>(url: string, file: File, params: Record<string, string>): Observable<A> => {
        if (file.size > this.maxFileSize) {
            this.toast.error(this.translate.instant('i18n_file_too_large'));
            return throwError(() => ({ data: 'i18n_file_too_large' }));
        }
        const formData = new FormData();
        formData.append('file', file);
        Object.entries(params).forEach(([key, value]) => formData.append(key, value));
        return this.http.post<A>(url, formData);
    };
}
