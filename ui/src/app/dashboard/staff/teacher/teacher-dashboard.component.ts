// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { take } from 'rxjs';
import { DashboardExam, ExtraData } from 'src/app/dashboard/dashboard.model';
import { Exam } from 'src/app/exam/exam.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ExamListCategoryComponent } from './categories/exam-list-category.component';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Component({
    selector: 'xm-teacher-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './teacher-dashboard.component.html',
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
export class TeacherDashboardComponent {
    activeTab = signal(1);
    userId = 0;
    activeExtraData: ExtraData[];
    finishedExtraData: ExtraData[];
    archivedExtraData: ExtraData[];

    finishedExams = signal<DashboardExam[]>([]);
    filteredFinished = signal<DashboardExam[]>([]);
    activeExams = signal<DashboardExam[]>([]);
    filteredActive = signal<DashboardExam[]>([]);
    archivedExams = signal<DashboardExam[]>([]);
    filteredArchived = signal<DashboardExam[]>([]);
    draftExams = signal<DashboardExam[]>([]);
    filteredDrafts = signal<DashboardExam[]>([]);

    private TeacherDashboard = inject(TeacherDashboardService);
    private Session = inject(SessionService);

    constructor() {
        this.activeExtraData = [
            {
                text: 'i18n_participation_unreviewed',
                property: 'unassessedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
                sliced: true,
            },
            {
                text: 'i18n_participation_unfinished',
                property: 'unfinishedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
                sliced: true,
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
                sliced: true,
            },
            {
                text: 'i18n_participation_unfinished',
                property: 'unfinishedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: false,
                sliced: true,
            },
        ];
        this.archivedExtraData = [
            {
                text: 'i18n_participations_assessed',
                property: 'assessedCount',
                link: ['/staff/exams', '__', '5'],
                checkOwnership: true,
                sliced: true,
            },
        ];

        this.userId = this.Session.getUser().id;
        this.TeacherDashboard.populate$()
            .pipe(take(1))
            .subscribe((dashboard) => {
                this.finishedExams.set(dashboard.finishedExams);
                this.filteredFinished.set(dashboard.finishedExams);
                this.activeExams.set(dashboard.activeExams);
                this.filteredActive.set(dashboard.activeExams);
                this.archivedExams.set(dashboard.archivedExams);
                this.filteredArchived.set(dashboard.archivedExams);
                this.draftExams.set(dashboard.draftExams);
                this.filteredDrafts.set(dashboard.draftExams);
            });
    }

    changeTab = (event: NgbNavChangeEvent) => this.activeTab.set(event.nextId);

    search = (text: string) => {
        // Helper to check ownership
        const isOwner = (exam: Exam) => exam.examOwners.some((eo) => eo.id === this.userId);

        // Helper to filter exams by search text
        const filterByText = (exams: DashboardExam[]) => {
            if (!text) return exams;
            const lower = text.toLowerCase();
            return exams.filter((exam) => {
                const code = exam.course?.code || '';
                const owners = exam.examOwners.map((eo) => `${eo.firstName} ${eo.lastName}`).join(' ');
                const aggregate = `${code} ${owners} ${exam.name}`.toLowerCase();
                return aggregate.includes(lower);
            });
        };

        // Helper to apply owner/unassessed logic
        const applyRules = (exams: DashboardExam[], includeUnassessed: boolean = false) =>
            exams.filter((exam) => (includeUnassessed ? exam.unassessedCount > 0 || isOwner(exam) : true));

        // Update filtered arrays
        this.filteredDrafts.set(applyRules(filterByText(this.draftExams()), false).filter(isOwner));
        this.filteredFinished.set(applyRules(filterByText(this.finishedExams()), true));
        this.filteredActive.set(applyRules(filterByText(this.activeExams()), true));
        this.filteredArchived.set(applyRules(filterByText(this.archivedExams()), false));
    };
}
