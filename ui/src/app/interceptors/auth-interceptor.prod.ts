// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<unknown>, next: HttpHandler) {
        const uncachedReq = req.clone({
            headers: req.headers
                .set('Cache-Control', 'no-cache;no-store')
                .set('Pragma', 'no-cache')
                .set('Expires', '0'),
        });

        // send cloned request with headers to the next handler.
        return next.handle(uncachedReq);
    }
}
