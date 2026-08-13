// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpEvent, HttpResponse } from '@angular/common/http';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, finalize, Observable, of, tap, throwError } from 'rxjs';
import { EssayAnswer } from 'src/app/question/question.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';

type Container = { attachment?: Attachment; objectVersion?: number };

export type DownloadOptions = {
    params?: Record<string, string | string[] | number | number[] | boolean | boolean[] | (string | number)[]>;
    method?: 'GET' | 'POST';
    /** If false, expects Base64-encoded text response (legacy). Default true = binary stream. */
    asBlob?: boolean;
    /** Called repeatedly with cumulative bytes received. Only meaningful for blob downloads. */
    onProgress?: (loaded: number) => void;
};

@Injectable({ providedIn: 'root' })
export class FileService {
    maxFileSize = 0;

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    private readonly _inProgress = signal<ReadonlySet<string>>(new Set());
    /** Reactive set of URLs whose downloads are currently in flight. */
    get downloading() {
        return this._inProgress.asReadonly();
    }

    download(url: string, filename: string, options: DownloadOptions = {}) {
        if (this._inProgress().has(url)) return;
        this._inProgress.update((s) => new Set([...s, url]));
        const release = () =>
            this._inProgress.update((s) => {
                const n = new Set(s);
                n.delete(url);
                return n;
            });

        const { params, method: optMethod = 'GET', asBlob = true, onProgress } = options;
        const method = optMethod;
        if (asBlob) {
            this.http
                .request(method, url, {
                    responseType: 'blob',
                    observe: 'events',
                    reportProgress: !!onProgress,
                    params: method === 'GET' ? params : undefined,
                    body: method === 'POST' && params ? { params } : undefined,
                })
                .pipe(finalize(release))
                .subscribe({
                    next: (event: HttpEvent<Blob>) => {
                        if (event.type === HttpEventType.DownloadProgress) {
                            onProgress?.(event.loaded);
                        } else if (event.type === HttpEventType.Response && event.body) {
                            this.saveBlob(event.body, filename);
                        }
                    },
                    error: (resp) => {
                        console.log('error ' + JSON.stringify(resp));
                        this.toast.error(resp.message ?? 'Download failed');
                    },
                });
            return;
        }
        this.http
            .request(method, url, {
                responseType: 'text',
                observe: 'response',
                params: method === 'GET' ? params : undefined,
                body: method === 'POST' && params ? { params } : undefined,
            })
            .pipe(finalize(release))
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

    /** Triggers a file download for a blob (anchor + object URL). Used by download() and by callers with an in-memory blob. */
    downloadBlob(blob: Blob, filename: string): void {
        this.saveBlob(blob, filename);
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
            this.saveBlob(blob, fileName);
        } catch {
            // Fallback for non-base64 data
            const text = contentType === 'application/json' ? JSON.stringify(data, null, 2) : data;
            this.saveBlob(new Blob([text], { type: contentType }), fileName);
        }
    }

    private saveBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
