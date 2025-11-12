// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { SessionService } from 'src/app/session/session.service';
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
    imports: [
        ExaminationPageHeaderComponent,
        ExaminationSectionComponent,
        AnswerInstructionsComponent,
        ExaminationNavigationComponent,
        ExaminationToolbarComponent,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationComponent implements OnDestroy {
    isCollaborative = signal(false);
    exam = signal<Examination | undefined>(undefined);
    activeSection = signal<ExaminationSection | undefined>(undefined);
    isPreview = signal(false);

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private Examination = inject(ExaminationService);
    private Session = inject(SessionService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        const isPreviewValue = this.route.snapshot.data.isPreview;
        const isCollaborativeValue = this.route.snapshot.data.isCollaborative || false;
        this.isPreview.set(isPreviewValue);
        this.isCollaborative.set(isCollaborativeValue);

        if (!isPreviewValue) {
            window.addEventListener('beforeunload', this.onUnload);
        }

        this.Examination.startExam$(
            this.route.snapshot.params.hash,
            isPreviewValue,
            isCollaborativeValue,
            this.route.snapshot.params.id,
        ).subscribe({
            next: (exam) => {
                exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                this.exam.set(exam);
                this.setActiveSection({ type: 'guide' });
                const currentIsPreview = this.isPreview();
                if (!currentIsPreview && exam.executionType.type === 'MATURITY') {
                    this.Enrolment.showMaturityInstructions({ exam }, exam.external);
                }
                if (!currentIsPreview) {
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
        window.removeEventListener('beforeunload', this.onUnload);
    }

    selectNewPage(event: { page: Partial<NavigationPage> }) {
        this.setActiveSection(event.page);
    }

    timedOut() {
        // Save all textual answers regardless of empty or not
        const currentExam = this.exam();
        if (!currentExam) {
            return;
        }
        this.Examination.saveAllTextualAnswersOfExam$(currentExam)
            .pipe(
                catchError((err) => {
                    if (err) console.log(err);
                    return of(err);
                }),
                finalize(() => this.logout('i18n_exam_time_is_up', true)),
            )
            .subscribe();
    }

    getSkipLinkPath(skipTarget: string) {
        return window.location.toString().includes(skipTarget) ? window.location : window.location + skipTarget;
    }

    private logout(msg: string, canFail: boolean) {
        const currentExam = this.exam();
        if (!currentExam) {
            return;
        }
        this.Examination.logout(msg, currentExam.hash, currentExam.implementation === 'CLIENT_AUTH', canFail);
    }

    private setActiveSection(page: Partial<NavigationPage>) {
        const currentActiveSection = this.activeSection();
        const currentExam = this.exam();
        if (currentActiveSection && currentExam) {
            this.Examination.saveAllTextualAnswersOfSection$(
                currentActiveSection,
                currentExam.hash,
                true,
                false,
                false,
            ).subscribe();
        }
        this.activeSection.set(undefined);
        if (page.type === 'section' && currentExam) {
            const section = this.findSection(currentExam, page.id as number);
            this.activeSection.set(section);
        }
        window.scrollTo(0, 0);
    }

    private findSection(exam: Examination, sectionId: number) {
        const i = exam.examSections.map((es) => es.id).indexOf(sectionId);
        if (i >= 0) {
            return exam.examSections[i];
        }
        throw Error('invalid index');
    }

    private onUnload(event: BeforeUnloadEvent) {
        event.preventDefault();
    }
}
