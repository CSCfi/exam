// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    NgbNav,
    NgbNavChangeEvent,
    NgbNavContent,
    NgbNavItem,
    NgbNavItemRole,
    NgbNavLink,
    NgbNavOutlet,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ExamListCategoryComponent, ExtraData } from './categories/exam-list-category.component';
import type { DashboardExam } from './teacher-dashboard.service';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Component({
    selector: 'xm-teacher-dashboard',
    templateUrl: './teacher-dashboard.component.html',
    standalone: true,
    imports: [
        RouterLink,
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        NgbNavContent,
        ExamListCategoryComponent,
        NgbNavOutlet,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class TeacherDashboardComponent implements OnInit {
    activeTab = 1;
    userId = 0;
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
    ) {
        this.activeExtraData = [
            {
                text: 'i18n_participation_unreviewed',
                property: 'unassessedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
            },
            {
                text: 'i18n_participation_unfinished',
                property: 'unfinishedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
            },
            {
                text: 'i18n_dashboard_title_waiting_reservation',
                property: 'reservationCount',
                link: ['/staff/reservations', '__'],
                checkOwnership: false,
            },
        ];
        this.finishedExtraData = [
            {
                text: 'i18n_participation_unreviewed',
                property: 'unassessedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
            },
            {
                text: 'i18n_participation_unfinished',
                property: 'unfinishedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
            },
        ];
        this.archivedExtraData = [
            {
                text: 'i18n_participations_assessed',
                property: 'assessedCount',
                link: ['/staff/exams', '__', '5'],
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
        });
    }

    changeTab = (event: NgbNavChangeEvent) => (this.activeTab = event.nextId);

    search = (text: string) => {
        // Use same search parameter for all the 4 result tables
        this.filteredFinished = this.find(this.finishedExams, text);
        this.filteredActive = this.find(this.activeExams, text);
        this.filteredArchived = this.find(this.archivedExams, text);
        this.filteredDrafts = this.find(this.draftExams, text);

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

    private find<T extends Exam>(exams: T[], filter: string): T[] {
        const getAggregate = (exam: Exam) => {
            const code = exam.course ? exam.course.code : '';
            const owners = exam.examOwners.map((eo) => `${eo.firstName} ${eo.lastName}`).join(' ');
            return `${code} ${owners} ${exam.name}`;
        };
        return !filter ? exams : exams.filter((e) => getAggregate(e).toLowerCase().includes(filter.toLowerCase()));
    }
}
