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
import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import type { Exam } from '../exam.model';
import type { UpdateProps } from './exam-tabs.service';
import { ExamTabService } from './exam-tabs.service';

@Component({
    selector: 'xm-exam-tabs',
    templateUrl: './exam-tabs.component.html',
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

    navChanged = (event: NgbNavChangeEvent) => this.router.navigate([event.nextId], { relativeTo: this.route });

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
