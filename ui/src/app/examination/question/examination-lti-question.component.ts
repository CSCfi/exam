// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-lti-question',
    template: `
        @if (isPreview()) {
            <div class="form-check form-switch mb-2">
                <input
                    class="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="lti-view-as-student-{{ sq().id }}"
                    [checked]="viewAsStudent()"
                    (change)="viewAsStudent.set(!viewAsStudent())"
                />
                <label class="form-check-label" for="lti-view-as-student-{{ sq().id }}">
                    {{ 'i18n_lti_view_as_student' | translate }}
                </label>
                <div class="form-text">{{ 'i18n_lti_view_as_student_info' | translate }}</div>
            </div>
        }
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
})
export class ExaminationLtiComponent {
    readonly sq = input.required<ExaminationQuestion>();
    readonly examHash = input<string>();
    readonly isPreview = input(false);
    // Previewing teachers see the tool as a student by default; the teacher view shows the tool's
    // own management and grading pages instead. A student always gets the student view.
    readonly viewAsStudent = signal(true);

    // The base URL comes from lti.platform.issuer on the backend; it still has to be listed in
    // the frame-src allow-list in application.conf for the iframe to load.
    readonly ltiUrl = computed(() => {
        const base = this.loginUrl();
        const hash = this.examHash();
        if (!base || !hash) return null;
        // The backend resolves the tool resource and the exam context from these, never from the UI.
        const params = new URLSearchParams({ sectionQuestionId: String(this.sq().id), examHash: hash });
        if (this.isPreview() && this.viewAsStudent()) params.set('asLearner', 'true');
        return this.sanitizer.bypassSecurityTrustResourceUrl(`${base}?${params}`);
    });

    private readonly sanitizer = inject(DomSanitizer);
    private readonly loginUrl = toSignal(inject(ExaminationService).getLtiLoginUrl$());
}
