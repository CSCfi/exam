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
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SessionService } from '../../session/session.service';
import { ExamTabService } from './examTabs.service';

import type { Exam } from '../exam.model';
import type { UpdateProps } from './examTabs.service';
import type { OnInit, OnDestroy } from '@angular/core';
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import type { User } from '../../session/session.service';

@Component({
    selector: 'exam-tabs',
    templateUrl: './examTabs.component.html',
})
export class ExamTabsComponent implements OnInit, OnDestroy {
    @Input() exam!: Exam;
    @Input() collaborative = false;

    user: User;
    examInfo: { title: string | null };
    activeTab = 1;
    private ngUnsubscribe = new Subject();

    constructor(
        private cdr: ChangeDetectorRef,
        private state: StateService,
        private translate: TranslateService,
        private Session: SessionService,
        private Tabs: ExamTabService,
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
        this.updateTitle(!this.exam.course ? null : this.exam.course.code, this.exam.name);
        this.initGradeScale();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private initGradeScale = () => {
        // Set exam grade scale from course default if not specifically set for exam
        if (!this.exam.gradeScale && this.exam.course && this.exam.course.gradeScale) {
            this.exam.gradeScale = this.exam.course.gradeScale;
        }
    };

    updateTitle = (code: string | null, name: string | null) => {
        if (code && name) {
            this.examInfo.title = `${code.split('_')[0]} ${name}`;
        } else if (code) {
            this.examInfo.title = `${code.split('_')[0]} ${this.translate.instant('sitnet_no_name')}`;
        } else if (name) {
            this.examInfo.title = name;
        } else {
            this.examInfo.title = this.translate.instant('sitnet_no_name');
        }
    };

    isOwner = () =>
        this.exam.examOwners &&
        this.exam.examOwners.some(
            (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
        );

    navChanged = (event: NgbNavChangeEvent, forceRegularExam = false) => {
        const params = forceRegularExam ? { collaborative: 'false', id: this.exam.id } : undefined;
        if (event.nextId === 1) {
            this.state.go('staff.examEditor.basic', params);
        } else if (event.nextId === 2) {
            this.state.go('staff.examEditor.sections', params);
        } else if (event.nextId === 3) {
            this.state.go('staff.examEditor.publication', params);
        } else if (event.nextId === 4) {
            this.state.go('estaff.xamEditor.assessments', params);
        } else if (event.nextId === 5) {
            this.state.go('staff.examEditor.questionReview', params);
        } else if (event.nextId === 6) {
            this.state.go('staff.examEditor.summary', params);
        }
    };

    examUpdated = (props: UpdateProps) => {
        this.updateTitle(props.code, props.name);
        if (props.scaleChange) {
            delete this.exam.autoEvaluationConfig;
        }
        if (props.initScale) {
            this.exam.gradeScale = this.exam?.course?.gradeScale;
        }
    };
}
