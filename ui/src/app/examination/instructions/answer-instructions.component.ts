// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination } from 'src/app/examination/examination.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { RichTextDirective } from 'src/app/shared/rich-text/rich-text.directive';

@Component({
    selector: 'xm-answer-instructions',
    template: `
        <!-- ANSWER INSTRUCTIONS -->
        <div class="guide">
            <h2 class="exam-title" aria-live="polite" id="examination-section">
                {{ 'i18n_exam_guide' | translate }}
            </h2>
            <dl class="xm-details guide-wrapper guide-list">
                @if (exam().course) {
                    <dt>{{ 'i18n_course_name' | translate }}:</dt>
                    <dd>{{ exam().course!.name }}</dd>
                    <dt>{{ 'i18n_course_code' | translate }}:</dt>
                    <dd><xm-course-code [course]="exam().course!"></xm-course-code></dd>
                }
                <dt>{{ 'i18n_exam_name' | translate }}:</dt>
                <dd>{{ exam().name }}</dd>
                <dt>{{ 'i18n_exam_duration' | translate }}:</dt>
                <dd>{{ printExamDuration() }}</dd>
                <dt>{{ 'i18n_exam_guide' | translate }}:</dt>
                <dd [xmRichText]="exam().instruction"></dd>
            </dl>
        </div>
    `,
    imports: [CourseCodeComponent, RichTextDirective, TranslateModule],
    styleUrls: ['../examination.shared.scss'],
    styles: `
        @use '../../shared/breakpoints' as bp;

        .guide {
            margin-top: var(--xm-space-3);
            padding-inline-start: var(--xm-space-3);
        }
        /* Labels in the first third of the row from md up, stacked below that; rows without gaps */
        .guide-list {
            grid-template-columns: minmax(0, 1fr);
            column-gap: 1.5rem;
            padding-inline: 22px;
            /* reaches into the column's padding on the right, as the old row did */
            margin-inline-end: -0.75rem;

            > dd {
                margin: 0;
            }

            @include bp.up(md) {
                grid-template-columns: calc((100% + 1.5rem) / 3 - 1.5rem) minmax(0, 1fr);
            }
        }
    `,
})
export class AnswerInstructionsComponent {
    readonly exam = input.required<Examination>();

    private readonly DateTime = inject(DateTimeService);

    printExamDuration() {
        return this.DateTime.formatDuration(this.exam().duration);
    }
}
