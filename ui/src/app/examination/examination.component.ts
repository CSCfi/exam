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
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { EnrolmentService } from '../enrolment/enrolment.service';
import { SessionService } from '../session/session.service';
import { WindowRef } from '../utility/window/window.service';
import { ExaminationService } from './examination.service';

import type { Examination, ExaminationSection } from './examination.service';
@Component({
    selector: 'examination',
    templateUrl: './examination.component.html',
})
export class ExaminationComponent {
    @Input() isCollaborative: boolean;
    exam: Examination;
    activeSection?: ExaminationSection;
    isPreview: boolean;

    constructor(
        private state: StateService,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private Examination: ExaminationService,
        private Session: SessionService,
        private Enrolment: EnrolmentService,
        private Window: WindowRef,
    ) {}

    ngOnInit() {
        this.isPreview = this.Window.nativeWindow.location.pathname.includes('preview'); // FIXME! once UI-router issues are settled
        if (!this.isPreview) {
            this.Window.nativeWindow.onbeforeunload = () => this.translate.instant('sitnet_unsaved_data_may_be_lost');
        }
        this.Examination.startExam$(
            this.routing.params.hash,
            this.isPreview,
            this.isCollaborative,
            this.routing.params.id,
        ).subscribe(
            (exam) => {
                exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                this.exam = exam;
                this.setActiveSection({ type: 'guide' });
                if (!this.isPreview && !this.exam.cloned && this.exam.executionType.type === 'MATURITY') {
                    this.Enrolment.showMaturityInstructions({ exam: this.exam });
                }
                if (!this.isPreview) {
                    this.Session.disableSessionCheck(); // we don't need this here and it might cause unwanted forwarding to another states
                }
            },
            (err) => {
                console.log(JSON.stringify(err));
                this.state.go('dashboard');
            },
        );
    }

    ngOnDestroy() {
        this.Window.nativeWindow.onbeforeunload = null;
    }

    selectNewPage = ($event: { page: { type: string; id?: number } }) => this.setActiveSection($event.page);

    timedOut = () =>
        // Save all textual answers regardless of empty or not
        this.Examination.saveAllTextualAnswersOfExam$(this.exam)
            .pipe(
                catchError((err) => {
                    if (err) console.log(err);
                    return of(err);
                }),
                finalize(() => this.logout('sitnet_exam_time_is_up', true)),
            )
            .subscribe();

    private logout = (msg: string, canFail: boolean) =>
        this.Examination.logout(msg, this.exam.hash, this.exam.implementation === 'CLIENT_AUTH', canFail);

    private setActiveSection = (page: { type: string; id?: number }) => {
        if (this.activeSection) {
            this.Examination.saveAllTextualAnswersOfSection$(
                this.activeSection,
                this.exam.hash,
                true,
                false,
                false,
            ).subscribe();
        }
        delete this.activeSection;
        if (page.type === 'section') {
            this.activeSection = this.findSection(page.id as number);
        }
        this.Window.nativeWindow.scrollTo(0, 0);
    };

    private findSection = (sectionId: number) => {
        const i = this.exam.examSections.map((es) => es.id).indexOf(sectionId);
        if (i >= 0) {
            return this.exam.examSections[i];
        }
    };
}
