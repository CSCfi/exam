/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SessionService } from '../../session/session.service';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { ExaminationClockComponent } from '../clock/examination-clock.component';
import type { Examination } from '../examination.model';

@Component({
    selector: 'xm-examination-header',
    template: `<div class="row">
        <div class="padr0 padl0 hidden-mobile">
            <div class="exam-header">
                <div class="exam-header-img-wrap">
                    <img src="/assets/images//exam-logo-mobile.svg" alt="" />
                </div>
                <div class="exam-header-title divider"></div>
                <div class="exam-header-title width-100 marl20 marr20">
                    {{ exam.course?.name }}
                    @if (exam.course) {
                        <xm-course-code [course]="exam.course"></xm-course-code>
                    }
                </div>
                <div class="language-selector">
                    <button class="green_button marl10" (click)="switchLanguage('fi')">FI</button>
                    <button class="green_button marl10" (click)="switchLanguage('sv')">SV</button>
                    <button class="green_button marl10" (click)="switchLanguage('en')">EN</button>
                    <div class="divider-free"></div>
                </div>
                @if (!isPreview) {
                    <xm-examination-clock [examHash]="exam.hash" (timedOut)="notifyTimeout()"> </xm-examination-clock>
                }
            </div>
        </div>
    </div>`,
    standalone: true,
    imports: [CourseCodeComponent, ExaminationClockComponent],
    styleUrl: './examination-header.component.scss',
})
export class ExaminationPageHeaderComponent {
    @Input() exam!: Examination;
    @Input() isPreview = false;
    @Output() timedOut = new EventEmitter<void>();

    constructor(private Session: SessionService) {}

    notifyTimeout = () => this.timedOut.emit();
    switchLanguage = (key: string) => this.Session.switchLanguage(key);
}
