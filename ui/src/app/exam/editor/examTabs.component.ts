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
import { ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/angular';
import * as _ from 'lodash';
import * as moment from 'moment';
import * as toastr from 'toastr';

import { SessionService } from '../../session/session.service';

import type { OnInit } from '@angular/core';
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import type { User } from '../../session/session.service';
import type { Exam, ExamParticipation } from '../exam.model';

@Component({
    selector: 'exam-tabs',
    templateUrl: './examTabs.component.html',
})
export class ExamTabsComponent implements OnInit {
    @Input() collaborative: boolean;
    user: User;
    examInfo: { title: string | null };
    exam: Exam;
    reviews: ExamParticipation[] = [];

    @ViewChild('nav', { static: false }) nav: NgbNav;
    activeTab: number;

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef,
        private state: StateService,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private Session: SessionService,
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
        this.getReviews(this.routing.params.id);
        this.activeTab = this.routing.params.tab ? parseInt(this.routing.params.tab) : 1;
        this.cdr.detectChanges();
    }

    //ngAfterViewInit() {}

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
        return this.exam?.examOwners.some(
            (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
        );
    };

    navChanged = (event: NgbNavChangeEvent) => {
        console.log('nav changed from ' + event.activeId + ' to ' + event.nextId);
        const params = { id: this.exam.id, tab: event.nextId };
        this.state.go(this.collaborative ? 'collaborativeExamEditor' : 'examEditor', params, { reload: false });
    };

    switchToBasicInfo = () => this.nav.select(1);

    switchToQuestions = () => this.nav.select(2);

    switchToPublishSettings = () => this.nav.select(3);

    examUpdated = (props: { code: string; name: string; scaleChange: boolean }) => {
        this.updateTitle(props.code, props.name);
        if (props.scaleChange) {
            // Propagate a change so that children (namely auto eval component) can act based on scale change
            this.exam = _.cloneDeep(this.exam);
        }
    };

    private downloadExam = () => {
        this.http.get<Exam>(`/app/exams/${this.routing.params.id}`).subscribe(
            (exam) => {
                this.exam = exam;
                this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
            },
            (err) => toastr.error(err.data),
        );
    };

    private downloadCollaborativeExam = () => {
        this.http.get<Exam>(`/integration/iop/exams/${this.routing.params.id}`).subscribe(
            (exam) => {
                this.exam = exam;
                this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
            },
            (err) => toastr.error(err.data),
        );
    };

    private getReviews = (examId: number) => {
        this.http.get<ExamParticipation[]>(this.getResource(examId)).subscribe((reviews) => {
            this.reviews = reviews;
            //this.activeTab = this.routing.params.tab; // seems that this can not be set until all async init operations are done
        });
    };

    private getResource = (examId: number) => {
        return this.collaborative ? `/integration/iop/reviews/${examId}` : `/app/reviews/${examId}`;
    };

    private hasEffectiveEnrolments = (exam: Exam) =>
        exam.examEnrolments.some((ee) => !_.isNil(ee.reservation) && moment(ee.reservation.endAt) > moment());
}
