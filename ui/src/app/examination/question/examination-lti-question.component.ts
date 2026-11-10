// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { Implementation } from 'src/app/exam/exam.model';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { LtiLaunchQueueService, LtiLaunchTicket } from './lti-launch-queue.service';

@Component({
    selector: 'xm-examination-lti-question',
    template: `
        @if (unavailable()) {
            <div class="text-muted">{{ 'i18n_lti_not_available' | translate }}</div>
        } @else if (frameSrc(); as src) {
            <iframe
                width="100%"
                height="500px"
                class="lti-frame"
                [src]="src"
                (load)="onFrameLoad($event)"
                title="LTI tool"
                referrerpolicy="no-referrer-when-downgrade"
                allow="clipboard-write *; camera *; microphone *"
            ></iframe>
        } @else {
            <!-- Waiting for the login URL, or for another LTI question's launch to finish. -->
            <div class="lti-frame-placeholder"></div>
        }
        @if (windowUrl(); as url) {
            <!-- For a tool that cannot work in the frame: an SSO login page refusing to be framed, or a browser
                 blocking the tool's cookies there (Safari). In a window of its own the tool is first-party. -->
            <div class="small text-muted mt-2">
                {{ 'i18n_lti_open_in_window_hint' | translate }}
                <a [href]="url" target="_blank" rel="noopener">{{ 'i18n_lti_open_in_window' | translate }}</a>
            </div>
        }
    `,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
})
export class ExaminationLtiComponent {
    readonly sq = input.required<ExaminationQuestion>();
    readonly examHash = input<string>();
    readonly isPreview = input(false);
    readonly implementation = input<Implementation>();

    // The base URL comes from lti.platform.issuer on the backend. Null while LTI is not in use.
    readonly ltiUrl = computed(() => {
        const url = this.launchUrl();
        return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
    });

    // The same launch in a window of its own, for when the tool cannot work in the frame. Offered in
    // previews and home exams; not in exam rooms or SEB exams, where the exam view is the only window.
    readonly windowUrl = computed(() => {
        const url = this.launchUrl();
        const offered = this.isPreview() || this.implementation() === 'WHATEVER';
        return url && offered ? `${url}&target=window` : null;
    });

    // No exam to launch from (the single-question preview), or LTI is not in use.
    readonly unavailable = computed(() => !this.examHash() || this.loginUrl() === null);

    // Set when it is this question's turn to launch, see LtiLaunchQueueService.
    readonly frameSrc = signal<SafeResourceUrl | null>(null);

    private readonly sanitizer = inject(DomSanitizer);
    private readonly queue = inject(LtiLaunchQueueService);
    private readonly loginUrl = toSignal(inject(ExaminationService).getLtiLoginUrl$());
    private ticket?: LtiLaunchTicket;

    private readonly launchUrl = computed(() => {
        const base = this.loginUrl();
        const hash = this.examHash();
        if (!base || !hash) return null;
        // The backend resolves the tool resource and the exam context from these, never from the UI.
        const params = new URLSearchParams({ sectionQuestionId: String(this.sq().id), examHash: hash });
        return `${base}?${params}`;
    });

    constructor() {
        effect((onCleanup) => {
            const url = this.ltiUrl();
            if (!url) return;
            const ticket = untracked(() => this.queue.enqueue(() => this.frameSrc.set(url)));
            this.ticket = ticket;
            onCleanup(() => {
                ticket.release();
                this.frameSrc.set(null);
            });
        });
    }

    /** The frame's first document comes after the platform's callback, so the next launch can go. */
    onFrameLoad(event: Event) {
        // A frame inserted before its src is bound first loads about:blank; that is not the launch.
        if (!(event.target as HTMLIFrameElement).getAttribute('src')) return;
        this.ticket?.release();
    }
}
