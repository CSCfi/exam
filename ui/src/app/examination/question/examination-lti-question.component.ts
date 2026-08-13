// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';

@Component({
    selector: 'xm-examination-lti-question',
    template: `
        @if (ltiUrl()) {
            <iframe
                width="100%"
                height="500px"
                class="lti-frame"
                [src]="ltiUrl()"
                title="LTI tool"
                referrerpolicy="no-referrer-when-downgrade"
                allow="clipboard-write *; camera *; microphone *"
            ></iframe>
        } @else {
            <div>NO LTI Tool loaded</div>
        }
    `,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationLtiComponent {
    readonly sq = input.required<ExaminationQuestion>();
    readonly isPreview = input(false);

    // POC: hardcoded to match lti.platform.issuer and the frame-src allow-list in
    // application.conf. The route itself is commented out pending the LTI backend port.
    readonly ltiUrl = computed(() => {
        const id = this.sq()?.question?.ltiId ?? '';
        return this.sanitizer.bypassSecurityTrustResourceUrl(
            `https://dev.exam.csc.fi/integration/lti/start-login?resourceId=${encodeURIComponent(id)}`,
        );
    });

    private readonly sanitizer = inject(DomSanitizer);
}
