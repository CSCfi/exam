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
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import { SessionService } from '../../session/session.service';
import type { EnrolmentInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'xm-exam-enrolments',
    template: `
        <div id="dashboard">
            <div class="row mt-2 ms-2 me-2" *ngIf="exam?.noTrialsLeft">
                <div class="col-md-12 alert-danger">
                    <h1>{{ 'sitnet_no_trials_left' | translate }}</h1>
                </div>
            </div>
            <xm-enrolment-details *ngIf="exam" [exam]="exam"></xm-enrolment-details>
            <div *ngIf="exams.length > 0">
                <div class="row mt-2 ms-4 me-4">
                    <div class="col-md-12 mt-2 ms-4 me-4">
                        <h3>{{ 'sitnet_student_exams' | translate }}</h3>
                    </div>
                </div>
                <div class="row mt-2 ms-4 me-4 " *ngFor="let exam of exams">
                    <div class="col-md-12">
                        <xm-exam-search-result [exam]="exam"></xm-exam-search-result>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class ExamEnrolmentsComponent implements OnInit {
    exam!: EnrolmentInfo;
    exams: EnrolmentInfo[] = [];

    constructor(
        private route: UIRouterGlobals,
        private toast: ToastrService,
        private Enrolment: EnrolmentService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        const user = this.Session.getUser();
        if (!user.loginRole) {
            // We can not load resources before role is known.
            return;
        }
        this.Enrolment.getEnrolmentInfo$(this.route.params.code, parseInt(this.route.params.id)).subscribe({
            next: (exam) => (this.exam = exam),
            error: this.toast.error,
        });
        this.Enrolment.listEnrolments$(this.route.params.code, parseInt(this.route.params.id)).subscribe({
            next: (exams) => (this.exams = exams),
            error: this.toast.error,
        });
    }
}
