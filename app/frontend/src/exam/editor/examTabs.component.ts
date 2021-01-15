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
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgbTabChangeEvent, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as angular from 'angular';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as toastr from 'toastr';

import { ReviewListService } from '../../review/listing/reviewList.service';
import { SessionService, User } from '../../session/session.service';
import { WindowRef } from '../../utility/window/window.service';
import { Exam, ExamParticipation } from '../exam.model';

@Component({
    selector: 'exam-tabs',
    template: require('./examTabs.component.html'),
})
export class ExamTabsComponent implements OnInit {
    @Input() collaborative: boolean;
    user: User;
    examInfo: { title: string | null };
    exam: Exam;
    reviews: ExamParticipation[];

    @ViewChild('tabs') tabs: NgbTabset;
    activeTab = '1';

    constructor(
        private http: HttpClient,
        private state: StateService,
        private translate: TranslateService,
        private Window: WindowRef,
        private Session: SessionService,
        private ReviewList: ReviewListService,
    ) {
        this.examInfo = { title: null };
    }

    ngOnInit() {
        this.user = this.Session.getUser();
        if (this.collaborative) {
            this.downloadCollaborativeExam();
        } else {
            this.downloadExam();
        }
        this.getReviews(this.state.params.id);
    }

    ngAfterViewInit() {
        // this.tabs.select(this.state.params.tab);
    }

    updateTitle = (code: string | null, name: string | null) => {
        if (code && name) {
            this.examInfo.title = `${code.split('_')[0]} ${name}`;
        } else if (code) {
            this.examInfo.title = `${code.split('_')[0]} ${this.translate.instant('sitnet_no_name')}`;
        } else {
            this.examInfo.title = name;
        }
    };

    isOwner = () => {
        return this.exam.examOwners.some(
            x => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
        );
    };

    onReviewsLoaded = (data: { reviews: ExamParticipation[] }) => (this.reviews = data.reviews);

    tabChanged = (event: NgbTabChangeEvent) => {
        const params = { id: this.exam.id, tab: event.nextId };
        this.state.go(this.collaborative ? 'collaborativeExamEditor' : 'examEditor', params, { notify: false });
    };

    switchToBasicInfo = () => this.tabs.select('1');

    switchToQuestions = () => this.tabs.select('2');

    switchToPublishSettings = () => this.tabs.select('3');

    examUpdated = (props: { code: string; name: string; scaleChange: boolean }) => {
        this.updateTitle(props.code, props.name);
        if (props.scaleChange) {
            // Propagate a change so that children (namely auto eval component) can act based on scale change
            this.exam = angular.copy(this.exam);
        }
    };

    goBack = (event: Event) => {
        event.preventDefault();
        this.Window.nativeWindow.history.back();
    };

    goToDashboard = (event: Event) => {
        event.preventDefault();
        this.state.go('dashboard');
    };

    private downloadExam = () => {
        this.http.get<Exam>(`/app/exams/${this.state.params.id}`).subscribe(
            exam => {
                this.exam = exam;
                this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
                this.activeTab = '2';
            },
            err => toastr.error(err.data),
        );
    };

    private downloadCollaborativeExam = () => {
        this.http.get<Exam>(`/integration/iop/exams/${this.state.params.id}`).subscribe(
            exam => {
                this.exam = exam;
                this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
                this.activeTab = '2';
            },
            err => toastr.error(err.data),
        );
    };

    private getReviews = (examId: number) => {
        this.http.get<ExamParticipation[]>(this.getResource(examId)).subscribe(reviews => {
            this.reviews = reviews;
            this.activeTab = this.state.params.tab; // seems that this can not be set until all async init operations are done
        });
    };

    private getResource = (examId: number) => {
        return this.collaborative ? `/integration/iop/reviews/${examId}` : `/app/reviews/${examId}`;
    };

    private hasEffectiveEnrolments = (exam: Exam) =>
        exam.examEnrolments.some(ee => !_.isNil(ee.reservation) && moment(ee.reservation.endAt) > moment());
}
