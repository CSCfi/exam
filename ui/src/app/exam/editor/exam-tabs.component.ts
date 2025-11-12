// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { NgbNav, NgbNavChangeEvent, NgbNavItem, NgbNavItemRole, NgbNavLink } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import type { UpdateProps } from './exam-tabs.service';
import { ExamTabService } from './exam-tabs.service';

@Component({
    selector: 'xm-exam-tabs',
    templateUrl: './exam-tabs.component.html',
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        RouterOutlet,
        LowerCasePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
    ],
    styleUrl: './exam-tabs.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamTabsComponent {
    exam = signal<Exam | undefined>(undefined);
    collaborative = signal(false);
    examInfo = signal<{ title: string | null }>({ title: null });
    activeTab = signal(1);
    user: User;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private translate = inject(TranslateService);
    private Session = inject(SessionService);
    private Tabs = inject(ExamTabService);
    private CourseCode = inject(CourseCodeService);

    constructor() {
        this.user = this.Session.getUser();
        this.collaborative.set(this.route.snapshot.queryParamMap.get('collaborative') === 'true');
        this.route.data.subscribe((data) => {
            const examValue = data.exam as Exam;
            this.exam.set(examValue);
            this.updateTitle(!examValue.course ? null : examValue.course.code, examValue.name);
            this.initGradeScale();
            this.Tabs.setExam(examValue);
            this.Tabs.setCollaborative(this.collaborative());
        });

        // React to tab changes using signals
        effect(() => {
            const change = this.Tabs.tabChangeSignal();
            if (change) {
                this.activeTab.set(change.tab);
            }
        });

        // React to exam updates using signals
        effect(() => {
            const update = this.Tabs.examUpdateSignal();
            if (update) {
                this.examUpdated(update.props);
            }
        });
    }

    updateTitle(code: string | null, name: string | null) {
        let title: string;
        if (code && name) {
            title = `${this.CourseCode.formatCode(code)} ${name}`;
        } else if (code) {
            title = `${this.CourseCode.formatCode(code)} ${this.translate.instant('i18n_no_name')}`;
        } else if (name) {
            title = name;
        } else {
            title = this.translate.instant('i18n_no_name');
        }
        this.examInfo.set({ title });
    }

    isOwner() {
        const currentExam = this.exam();
        return (
            currentExam?.examOwners &&
            currentExam.examOwners.some(
                (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
            )
        );
    }

    navChanged(event: NgbNavChangeEvent) {
        this.router.navigate([event.nextId], {
            relativeTo: this.route,
            queryParams: { collaborative: this.collaborative() },
        });
    }

    examUpdated(props: UpdateProps) {
        this.updateTitle(props.code, props.name);
        const currentExam = this.exam();
        if (!currentExam) return;
        if (props.scaleChange) {
            const { autoEvaluationConfig: _autoEvaluationConfig, ...examWithoutAutoEval } = currentExam;
            void _autoEvaluationConfig;
            this.exam.set(examWithoutAutoEval as Exam);
        }
        if (props.initScale) {
            this.exam.update((exam) => {
                if (!exam) return exam;
                return {
                    ...exam,
                    gradeScale: exam.course?.gradeScale,
                } as Exam;
            });
        }
    }

    private initGradeScale() {
        // Set exam grade scale from course default if not specifically set for exam
        const currentExam = this.exam();
        if (!currentExam) return;
        if (!currentExam.gradeScale && currentExam.course && currentExam.course.gradeScale) {
            this.exam.update((exam) => {
                if (!exam) return exam;
                return {
                    ...exam,
                    gradeScale: exam.course?.gradeScale,
                } as Exam;
            });
        }
    }
}
