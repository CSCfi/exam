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
import { Component, OnInit } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import * as toast from 'toastr';

import { SessionService } from '../../session/session.service';
import { EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'app-exam-enrolments',
    template: `
        <div id="dashboard">
            <div class="row mt-2 ml-2" *ngIf="exam?.noTrialsLeft">
                <div class="col-md-12 alert-danger">
                    <h1>{{ 'sitnet_no_trials_left' | translate }}</h1>
                </div>
            </div>
            <app-enrolment-details *ngIf="exam" [exam]="exam"></app-enrolment-details>
            <div *ngIf="exams?.length > 0">
                <div class="row mt-2 ml-4">
                    <div class="col-md-12 mt-2 ml-4">
                        <h3>{{ 'sitnet_student_exams' | translate }}</h3>
                    </div>
                </div>
                <div class="row mt-2 ml-4" *ngFor="let exam of exams">
                    <div class="col-md-12">
                        <app-exam-search-result [exam]="exam"></app-exam-search-result>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class ExamEnrolmentsComponent implements OnInit {
    exam: EnrolmentInfo;
    exams: EnrolmentInfo[];

    constructor(
        private routing: UIRouterGlobals,
        private Enrolment: EnrolmentService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        const user = this.Session.getUser();
        if (!user.loginRole) {
            // We can not load resources before role is known.
            return;
        }
        this.Enrolment.getEnrolmentInfo(this.routing.params.code, parseInt(this.routing.params.id, 10)).subscribe(
            (exam) => (this.exam = exam),
            (err) => toast.error(err.data),
        );
        this.Enrolment.listEnrolments(this.routing.params.code, parseInt(this.routing.params.id, 10)).subscribe(
            (exams) => (this.exams = exams),
            (err) => toast.error(err.data),
        );
    }
}
