// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { SebApiService } from 'src/app/shared/seb/seb-api.service';
import { environment } from 'src/environments/environment';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>,
) => {
    const sebApi = inject(SebApiService);

    // Check if configKey has changed (will update tracking if so)
    // SEB updates configKey when it detects navigation (actual page load, not SPA routing)
    const configKey = sebApi.getSebConfigKey();
    const sebPageUrl = sebApi.getSebUrlForConfigKey();

    if (!configKey || !sebPageUrl) {
        // Not in SEB
        return next(withHeaders(req));
    }

    // We send both the configKey and the URL SEB used to calculate it
    return next(withHeaders(req, configKey, sebPageUrl));
};

function withHeaders(req: HttpRequest<unknown>, sebConfigKey?: string, pageUrl?: string) {
    let headers = req.headers.set('Cache-Control', 'no-cache;no-store').set('Pragma', 'no-cache').set('Expires', '0');

    // Only set CSRF token in development
    if (!environment.production) {
        headers = headers.set('Csrf-Token', 'nocheck');
    }

    // Add SEB headers if provided (for modern WebView JS API)
    if (sebConfigKey && pageUrl) {
        headers = headers.set('X-Exam-Seb-Config-Key', sebConfigKey).set('X-Exam-Seb-Config-Url', pageUrl);
    }

    return req.clone({ headers });
}
