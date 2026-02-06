// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SebApiService } from 'src/app/shared/seb/seb-api.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
    private sebApi: SebApiService = inject(SebApiService);

    intercept(req: HttpRequest<unknown>, next: HttpHandler) {
        // Check if configKey has changed (will update tracking if so)
        const configKey = this.sebApi.getSebConfigKey();
        const sebPageUrl = this.sebApi.getSebUrlForConfigKey();

        if (!configKey || !sebPageUrl) {
            // Not in SEB or SEB not configured - proceed without SEB headers
            return next.handle(this.addHeaders(req));
        }

        // SEB updates configKey when it detects navigation (actual page load, not SPA routing)
        // We send both the configKey and the URL SEB used to calculate it
        return next.handle(this.addHeaders(req, configKey, sebPageUrl));
    }

    private addHeaders(req: HttpRequest<unknown>, sebConfigKey?: string, pageUrl?: string): HttpRequest<unknown> {
        let headers = req.headers
            .set('Cache-Control', 'no-cache;no-store')
            .set('Pragma', 'no-cache')
            .set('Expires', '0');

        // Only set CSRF token in development
        if (!environment.production) {
            headers = headers.set('Csrf-Token', 'nocheck');
        }

        // Add SEB headers if provided (for modern WebView JavaScript API)
        if (sebConfigKey && pageUrl) {
            headers = headers.set('X-Exam-Seb-Config-Key', sebConfigKey).set('X-Exam-Seb-Config-Url', pageUrl);
        }

        return req.clone({ headers });
    }
}
