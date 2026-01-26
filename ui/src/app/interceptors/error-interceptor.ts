// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ErrorInterceptor implements HttpInterceptor {
    private translate = inject(TranslateService);

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            catchError((response: HttpErrorResponse) => {
                if (response.status === 0 || response.status === 504) {
                    // connection failure
                    return throwError(() => this.translate.instant('i18n_connection_refused'));
                } else if (response.error?.status === 'validation_error') {
                    // data validation error
                    return throwError(() => this.translate.instant(response.error.message));
                } else if (response.headers.get('x-exam-delay-execution')) {
                    // pass to next for handling
                    throw response;
                } else if (typeof response.error === 'string') {
                    return throwError(() => this.translate.instant(response.error));
                } else {
                    // undefined error object
                    return throwError(() => this.translate.instant('i18n_unexpected_error'));
                }
            }),
        );
    }
}
