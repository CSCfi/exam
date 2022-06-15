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
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import type { ExamExecutionType } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import { ExtraData } from './categories/exam-list-category.component';
import { ExamSearchPipe } from './exam-search.pipe';
import type { DashboardExam } from './teacher-dashboard.service';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Component({
    selector: 'xm-teacher-dashboard',
    templateUrl: './teacher-dashboard.component.html',
})
export class TeacherDashboardComponent implements OnInit {
    activeTab = 1;
    userId = 0;
    executionTypes: (ExamExecutionType & { examinationTypes: { type: string; name: string }[] })[] = [];
    activeExtraData: ExtraData[];
    finishedExtraData: ExtraData[];
    archivedExtraData: ExtraData[];

    finishedExams: DashboardExam[] = [];
    filteredFinished: DashboardExam[] = [];
    activeExams: DashboardExam[] = [];
    filteredActive: DashboardExam[] = [];
    archivedExams: DashboardExam[] = [];
    filteredArchived: DashboardExam[] = [];
    draftExams: DashboardExam[] = [];
    filteredDrafts: DashboardExam[] = [];

    constructor(
        private TeacherDashboard: TeacherDashboardService,
        private Session: SessionService,
        private searchFilter: ExamSearchPipe,
    ) {
        this.activeExtraData = [
            {
                text: 'sitnet_participation_unreviewed',
                property: 'unassessedCount',
                link: '/staff/exams/__/4',
                checkOwnership: false,
            },
            {
                text: 'sitnet_participation_unfinished',
                property: 'unfinishedCount',
                link: '/staff/exams/__/4',
                checkOwnership: false,
            },
            {
                text: 'sitnet_dashboard_title_waiting_reservation',
                property: 'reservationCount',
                link: '/staff/reservations/__',
                checkOwnership: false,
            },
        ];
        this.finishedExtraData = [
            {
                text: 'sitnet_participation_unreviewed',
                property: 'unassessedCount',
                link: '/staff/exams/__/4',
                checkOwnership: false,
            },
            {
                text: 'sitnet_participation_unfinished',
                property: 'unfinishedCount',
                link: '/staff/exams/__/4',
                checkOwnership: false,
            },
        ];
        this.archivedExtraData = [
            {
                text: 'sitnet_participations_assessed',
                property: 'assessedCount',
                link: '/staff/exams/__/4',
                checkOwnership: true,
            },
        ];
    }

    ngOnInit() {
        this.userId = this.Session.getUser().id;
        this.TeacherDashboard.populate$().subscribe((dashboard) => {
            this.filteredFinished = this.finishedExams = dashboard.finishedExams;
            this.filteredActive = this.activeExams = dashboard.activeExams;
            this.filteredArchived = this.archivedExams = dashboard.archivedExams;
            this.filteredDrafts = this.draftExams = dashboard.draftExams;
            this.TeacherDashboard.getByodSupportStatus$().subscribe((resp) => {
                const byodSupported = resp.isByodExaminationSupported;
                this.executionTypes = dashboard.executionTypes.map((t) => {
                    const examinationTypes =
                        t.type !== 'PRINTOUT' && byodSupported
                            ? [
                                  { type: 'AQUARIUM', name: 'sitnet_examination_type_aquarium' },
                                  { type: 'CLIENT_AUTH', name: 'sitnet_examination_type_seb' },
                                  { type: 'WHATEVER', name: 'sitnet_examination_type_home_exam' },
                              ]
                            : [];
                    return { ...t, examinationTypes: examinationTypes };
                });
            });
        });
    }

    changeTab = (event: NgbNavChangeEvent) => (this.activeTab = event.nextId);

    search = (text: string) => {
        // Use same search parameter for all the 4 result tables
        this.filteredFinished = this.searchFilter.transform(this.finishedExams, text);
        this.filteredActive = this.searchFilter.transform(this.activeExams, text);
        this.filteredArchived = this.searchFilter.transform(this.archivedExams, text);
        this.filteredDrafts = this.searchFilter.transform(this.draftExams, text);

        // for drafts, display exams only for owners AM-1658
        this.filteredDrafts = this.filteredDrafts.filter((exam) =>
            exam.examOwners.some((eo: User) => eo.id === this.userId),
        );

        // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
        this.filteredFinished = this.filteredFinished.filter(
            (exam) => exam.unassessedCount > 0 || exam.examOwners.some((eo: User) => eo.id === this.userId),
        );

        // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
        this.filteredActive = this.filteredActive.filter(
            (exam) => exam.unassessedCount > 0 || exam.examOwners.some((eo: User) => eo.id === this.userId),
        );
    };
}
