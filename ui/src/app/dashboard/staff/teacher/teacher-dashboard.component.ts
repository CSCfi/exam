// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
import type { User } from 'src/app/session/session.model';
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

        effect(() => {
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
        });
    }

    changeTab = (event: NgbNavChangeEvent) => this.activeTab.set(event.nextId);

    search = (text: string) => {
        // Use same search parameter for all the 4 result tables
        this.filteredFinished.set(this.find(this.finishedExams(), text));
        this.filteredActive.set(this.find(this.activeExams(), text));
        this.filteredArchived.set(this.find(this.archivedExams(), text));
        this.filteredDrafts.set(this.find(this.draftExams(), text));

        // for drafts, display exams only for owners AM-1658
        this.filteredDrafts.update((drafts) =>
            drafts.filter((exam) => exam.examOwners.some((eo: User) => eo.id === this.userId)),
        );

        // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
        this.filteredFinished.update((finished) =>
            finished.filter(
                (exam) => exam.unassessedCount > 0 || exam.examOwners.some((eo: User) => eo.id === this.userId),
            ),
        );

        // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
        this.filteredActive.update((active) =>
            active.filter(
                (exam) => exam.unassessedCount > 0 || exam.examOwners.some((eo: User) => eo.id === this.userId),
            ),
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
