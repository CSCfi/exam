// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgbNav, NgbNavChangeEvent, NgbNavItem, NgbNavItemRole, NgbNavLink } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
    standalone: true,
    imports: [
        RouterLink,
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
})
export class ExamTabsComponent implements OnInit, OnDestroy {
    exam!: Exam;
    collaborative = false;
    user: User;
    examInfo: { title: string | null };
    activeTab = 1;
    private ngUnsubscribe = new Subject();

    constructor(
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private Session: SessionService,
        private Tabs: ExamTabService,
        private CourseCode: CourseCodeService,
    ) {
        this.user = this.Session.getUser();
        this.examInfo = { title: null };
        this.Tabs.tabChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((tab: number) => {
            this.activeTab = tab;
            this.cdr.detectChanges();
        });
        this.Tabs.examUpdate$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((props: UpdateProps) => {
            this.examUpdated(props);
        });
    }

    ngOnInit() {
        this.collaborative = this.route.snapshot.queryParamMap.get('collaborative') === 'true';
        this.route.data.subscribe((data) => {
            this.exam = data.exam;
            this.updateTitle(!this.exam.course ? null : this.exam.course.code, this.exam.name);
            this.initGradeScale();
            this.Tabs.setExam(this.exam);
            this.Tabs.setCollaborative(this.collaborative);
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    updateTitle = (code: string | null, name: string | null) => {
        if (code && name) {
            this.examInfo.title = `${this.CourseCode.formatCode(code)} ${name}`;
        } else if (code) {
            this.examInfo.title = `${this.CourseCode.formatCode(code)} ${this.translate.instant('i18n_no_name')}`;
        } else if (name) {
            this.examInfo.title = name;
        } else {
            this.examInfo.title = this.translate.instant('i18n_no_name');
        }
    };

    isOwner = () =>
        this.exam.examOwners &&
        this.exam.examOwners.some(
            (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
        );

    navChanged = (event: NgbNavChangeEvent) =>
        this.router.navigate([event.nextId], {
            relativeTo: this.route,
            queryParams: { collaborative: this.collaborative },
        });

    examUpdated = (props: UpdateProps) => {
        this.updateTitle(props.code, props.name);
        if (props.scaleChange) {
            delete this.exam.autoEvaluationConfig;
        }
        if (props.initScale) {
            this.exam.gradeScale = this.exam?.course?.gradeScale;
        }
    };

    private initGradeScale = () => {
        // Set exam grade scale from course default if not specifically set for exam
        if (!this.exam.gradeScale && this.exam.course && this.exam.course.gradeScale) {
            this.exam.gradeScale = this.exam.course.gradeScale;
        }
    };
}
