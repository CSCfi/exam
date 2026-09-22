// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

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

    // The base URL comes from lti.platform.issuer on the backend; it still has to be listed in
    // the frame-src allow-list in application.conf for the iframe to load.
    readonly ltiUrl = computed(() => {
        const base = this.loginUrl();
        if (!base) return null;
        const id = this.sq()?.question?.ltiId ?? '';
        return this.sanitizer.bypassSecurityTrustResourceUrl(`${base}?resourceId=${encodeURIComponent(id)}`);
    });

    private readonly sanitizer = inject(DomSanitizer);
    private readonly loginUrl = toSignal(inject(ExaminationService).getLtiLoginUrl$());
}
