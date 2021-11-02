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
import { Component } from '@angular/core';
import { StateService } from '@uirouter/core';

import { SessionService } from '../../../session/session.service';
import { ExtraColumnName } from './categories/examListCategory.component';
import { ExamSearchPipe } from './examSearch.pipe';
import { TeacherDashboardService } from './teacherDashboard.service';

import type { OnInit } from '@angular/core';
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import type { Exam, ExamExecutionType } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import type { ActiveExam, ArchivedExam, DraftExam, FinalizedExam } from './teacherDashboard.service';

@Component({
    selector: 'teacher-dashboard',
    templateUrl: './teacherDashboard.component.html',
})
export class TeacherDashboardComponent implements OnInit {
    activeTab: string;
    userId: number;
    executionTypes: (ExamExecutionType & { examinationTypes: { type: string; name: string }[] })[] = [];
    activeExtraColumns: ExtraColumnName[] = [];
    finishedExtraColumns: ExtraColumnName[] = [];
    archivedExtraColumns: ExtraColumnName[] = [];
    draftExtraColumns: ExtraColumnName[] = [];

    finishedExams: FinalizedExam[] = [];
    filteredFinished: FinalizedExam[] = [];
    activeExams: ActiveExam[] = [];
    filteredActive: ActiveExam[] = [];
    archivedExams: ArchivedExam[] = [];
    filteredArchived: ArchivedExam[] = [];
    draftExams: DraftExam[] = [];
    filteredDrafts: DraftExam[] = [];

    constructor(
        private http: HttpClient,
        private TeacherDashboard: TeacherDashboardService,
        private Session: SessionService,
        private state: StateService,
        private searchFilter: ExamSearchPipe,
    ) {
        this.activeExtraColumns = [
            {
                text: 'sitnet_participation_unreviewed',
                property: 'unassessedCount',
            },
            {
                text: 'sitnet_participation_unfinished',
                property: 'unfinishedCount',
            },
            {
                text: 'sitnet_dashboard_title_waiting_reservation',
                property: 'reservationCount',
            },
        ];
        this.finishedExtraColumns = [
            {
                text: 'sitnet_participation_unreviewed',
                property: 'unassessedCount',
            },
            {
                text: 'sitnet_participation_unfinished',
                property: 'unfinishedCount',
            },
        ];
        this.archivedExtraColumns = [
            {
                text: 'sitnet_participations_assessed',
                property: 'assessedCount',
            },
        ];
        this.draftExtraColumns = [];
    }

    getActiveExtraColumns = () => this.activeExtraColumns;
    getActiveExtraColumnValues = (exam: Exam) => {
        const activeExam = exam as ActiveExam;
        return [
            { link: '/staff/exams/__/regular/4', checkOwnership: false, value: activeExam.unassessedCount },
            { link: '/staff/exams/__/regular/4', checkOwnership: true, value: activeExam.unfinishedCount },
            { link: '/staff/reservations/__', checkOwnership: false, value: activeExam.reservationCount },
        ];
    };
    getFinishedExtraColumns = () => this.finishedExtraColumns;
    getFinishedExtraColumnValues = (exam: Exam) => {
        const finishedExam = exam as FinalizedExam;
        return [
            { link: '/staff/exams/__/regular/4', checkOwnership: false, value: finishedExam.unassessedCount },
            { link: '/staff/exams/__/regular/4', checkOwnership: true, value: finishedExam.unfinishedCount },
        ];
    };
    getArchivedExtraColumns = () => this.archivedExtraColumns;
    getArchivedExtraColumnValues = (exam: Exam) => {
        const archivedExam = exam as ArchivedExam;
        return [{ link: '/staff/exams/__/regular/4', checkOwnership: true, value: archivedExam.assessedCount }];
    };

    ngOnInit() {
        this.userId = this.Session.getUser().id;
        this.TeacherDashboard.populate().subscribe((dashboard) => {
            this.filteredFinished = this.finishedExams = dashboard.finishedExams;
            this.filteredActive = this.activeExams = dashboard.activeExams;
            this.filteredArchived = this.archivedExams = dashboard.archivedExams;
            this.filteredDrafts = this.draftExams = dashboard.draftExams;
            this.http.get<{ isByodExaminationSupported: boolean }>('/app/settings/byod').subscribe((resp) => {
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

    changeTab = (event: NgbNavChangeEvent) => {
        this.activeTab = event.nextId;
        this.state.go('staff.teacher', { tab: event.nextId });
    };

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
