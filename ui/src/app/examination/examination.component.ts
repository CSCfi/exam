// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize } from 'rxjs/operators';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { SessionService } from 'src/app/session/session.service';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
import { SebApiService } from 'src/app/shared/services/seb-api.service';
import type { Examination, ExaminationSection, NavigationPage } from './examination.model';
import { ExaminationService } from './examination.service';
import { ExaminationPageHeaderComponent } from './header/examination-header.component';
import { AnswerInstructionsComponent } from './instructions/answer-instructions.component';
import { ExaminationNavigationComponent } from './navigation/examination-navigation.component';
import { ExaminationToolbarComponent } from './navigation/examination-toolbar.component';
import { ExaminationSectionComponent } from './section/examination-section.component';

@Component({
    selector: 'xm-examination',
    templateUrl: './examination.component.html',
    standalone: true,
    imports: [
        ExaminationPageHeaderComponent,
        ExaminationSectionComponent,
        AnswerInstructionsComponent,
        ExaminationNavigationComponent,
        ExaminationToolbarComponent,
        TranslateModule,
    ],
})
export class ExaminationComponent implements OnInit, OnDestroy {
    isCollaborative = false;
    isPreview = false;
    exam!: Examination;
    activeSection?: ExaminationSection;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private Examination: ExaminationService,
        private Enrolment: EnrolmentService,
        private Session: SessionService,
        private errorHandler: ErrorHandlingService,
        private SebApi: SebApiService,
    ) {}

    ngOnInit() {
        this.isPreview = this.route.snapshot.data.isPreview;
        this.isCollaborative = this.route.snapshot.data.isCollaborative || false;
        if (!this.isPreview) {
            window.addEventListener('beforeunload', this.onUnload);
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
                if (this.exam.implementation === 'CLIENT_AUTH') {
                    this.validateSebConfig();
                }
            },
            error: (error) => {
                this.errorHandler.handle(error, 'ExaminationComponent.ngOnInit').subscribe(() => {
                    this.router.navigate(['/dashboard']);
                });
            },
        });
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    selectNewPage = (event: { page: Partial<NavigationPage> }) => this.setActiveSection(event.page);

    timedOut = () =>
        // Save all textual answers regardless of empty or not
        this.Examination.saveAllTextualAnswersOfExam$(this.exam)
            .pipe(
                catchError((error) => this.errorHandler.handle(error, 'ExaminationComponent.timedOut')),
                finalize(() => this.logout('i18n_exam_time_is_up', true)),
            )
            .subscribe();

    getSkipLinkPath = (skipTarget: string) => {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    };

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

    private onUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
    };

    private validateSebConfig(): void {
        if (!this.SebApi.validateSebConfig()) {
            this.router.navigate(['/waitingroom'], {
                queryParams: { error: 'seb_config_mismatch' },
            });
        }
    }
}
