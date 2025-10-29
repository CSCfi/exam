// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

declare global {
    interface Window {
        SafeExamBrowser?: {
            security: {
                configKey: string; // Page-based digest
                browserExamKey: string;
            };
            version: string;
        };
    }
}

@Injectable({ providedIn: 'root' })
export class SebApiService {
    private lastKnownUrl: string | null = null;
    private lastKnownConfigKey: string | null = null;

    constructor() {
        // Capture the initial URL and key if SEB is available
        if (window.SafeExamBrowser) {
            this.lastKnownUrl = window.location.href;
            this.lastKnownConfigKey = window.SafeExamBrowser.security.configKey || null;
        }
    }

    getSebVersion = (): string | null => window.SafeExamBrowser?.version || null;

    getSebConfigKey = (): string | null => {
        if (!window.SafeExamBrowser) {
            return null;
        }

        const currentKey = window.SafeExamBrowser.security.configKey;

        // Check if configKey has changed (SEB updated it due to navigation)
        if (currentKey !== this.lastKnownConfigKey) {
            // SEB detected a real navigation (not SPA routing)
            this.lastKnownConfigKey = currentKey;
            this.lastKnownUrl = window.location.href;
        }

        return currentKey;
    };

    getSebUrlForConfigKey = (): string | null => {
        // Return the URL that corresponds to the current configKey
        // This is the URL SEB used when it last calculated the configKey
        return this.lastKnownUrl;
    };
}
