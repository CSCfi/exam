// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>,
) => {
    const translate = inject(TranslateService);

    return next(req).pipe(
        catchError((response: HttpErrorResponse) => {
            if (response.status === 0 || response.status === 504) {
                // connection failure
                return throwError(() => translate.instant('i18n_connection_refused'));
            } else if (response.error?.status === 'validation_error') {
                // data validation error
                return throwError(() => translate.instant(response.error.message));
            } else if (response.headers.get('x-exam-delay-execution')) {
                // pass to next for handling
                return throwError(() => response);
            } else if (typeof response.error === 'string') {
                return throwError(() => translate.instant(response.error));
            } else {
                // undefined error object
                return throwError(() => translate.instant('i18n_unexpected_error'));
            }
        }),
    );
};
