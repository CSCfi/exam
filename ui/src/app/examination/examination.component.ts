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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { EnrolmentService } from '../enrolment/enrolment.service';
import { SessionService } from '../session/session.service';
import type { Examination, ExaminationSection, NavigationPage } from './examination.model';
import { ExaminationService } from './examination.service';

@Component({
    selector: 'xm-examination',
    templateUrl: './examination.component.html',
})
export class ExaminationComponent implements OnInit, OnDestroy {
    isCollaborative = false;
    exam!: Examination;
    activeSection?: ExaminationSection;
    isPreview = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private translate: TranslateService,
        private Examination: ExaminationService,
        private Session: SessionService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        this.isPreview = this.route.snapshot.data.isPreview;
        this.isCollaborative = this.route.snapshot.data.isCollaborative || false;
        if (!this.isPreview) {
            window.onbeforeunload = () => this.translate.instant('sitnet_unsaved_data_may_be_lost');
        }
        this.Examination.startExam$(
            this.route.snapshot.params.hash,
            this.isPreview,
            this.isCollaborative,
            this.route.snapshot.params.id,
        ).subscribe({
            next: (exam) => {
                exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                this.exam = exam;
                this.setActiveSection({ type: 'guide' });
                if (!this.isPreview && this.exam.executionType.type === 'MATURITY') {
                    this.Enrolment.showMaturityInstructions({ exam: this.exam }, this.exam.external);
                }
                if (!this.isPreview) {
                    this.Session.disableSessionCheck(); // we don't need this here and it might cause unwanted forwarding to another states
                }
            },
            error: (err) => {
                console.log(JSON.stringify(err));
                this.router.navigate(['/dashboard']);
            },
        });
    }

    ngOnDestroy() {
        window.onbeforeunload = null;
    }

    selectNewPage = (event: { page: Partial<NavigationPage> }) => this.setActiveSection(event.page);

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

    private setActiveSection = (page: Partial<NavigationPage>) => {
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
        window.scrollTo(0, 0);
    };

    private findSection = (sectionId: number) => {
        const i = this.exam.examSections.map((es) => es.id).indexOf(sectionId);
        if (i >= 0) {
            return this.exam.examSections[i];
        }
        throw Error('invalid index');
    };
}
