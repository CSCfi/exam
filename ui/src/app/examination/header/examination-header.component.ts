// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ExaminationClockComponent } from 'src/app/examination/clock/examination-clock.component';
import type { Examination } from 'src/app/examination/examination.model';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

@Component({
    selector: 'xm-examination-header',
    template: `<div class="row">
        <div class="pe-0 ps-0">
            <div class="exam-header">
                <div class="exam-header-img-wrap">
                    <img src="/assets/images/exam-logo-mobile.svg" alt="" />
                </div>
                <div class="exam-header-divider ms-2"></div>
                <div class="exam-header-title ms-2  ">
                    {{ exam().course?.name }}
                    @if (exam().course) {
                        <xm-course-code [course]="exam().course!"></xm-course-code>
                    }
                </div>
                <div class="language-selector">
                    <button class="btn btn-success btn-sm" (click)="switchLanguage('fi')">FI</button>
                    <button class="btn btn-success btn-sm" (click)="switchLanguage('sv')">SV</button>
                    <button class="btn btn-success btn-sm" (click)="switchLanguage('en')">EN</button>
                </div>
                @if (!isPreview()) {
                    <xm-examination-clock [examHash]="exam().hash" (timedOut)="notifyTimeout()"></xm-examination-clock>
                }
            </div>
        </div>
    </div>`,
    imports: [CourseCodeComponent, ExaminationClockComponent],
    styleUrls: ['../examination.shared.scss', './examination-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationPageHeaderComponent {
    readonly exam = input.required<Examination>();
    readonly isPreview = input(false);
    readonly timedOut = output<void>();

    private readonly Session = inject(SessionService);

    notifyTimeout() {
        this.timedOut.emit();
    }

    switchLanguage(key: string) {
        this.Session.switchLanguage(key);
    }
}
