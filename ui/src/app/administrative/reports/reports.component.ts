// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RoomService } from 'src/app/facility/rooms/room.service';
import { ExamRoom } from 'src/app/reservation/reservation.model';
import { User } from 'src/app/session/session.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { Option } from 'src/app/shared/select/select.model';
import { UserService } from 'src/app/shared/user/user.service';
import { AnswersReportComponent } from './categories/answers-report.component';
import { EnrolmentsReportComponent } from './categories/enrolments-report.component';
import { ExamsReportComponent } from './categories/exams-report.component';
import { RecordsReportComponent } from './categories/records-report.component';
import { ReviewsReportComponent } from './categories/reviews-report.component';
import { RoomsReportComponent } from './categories/rooms-report.component';
import { StudentsReportComponent } from './categories/students-report.component';
import { TeachersReportComponent } from './categories/teachers-report.component';
import { ReportsService } from './reports.service';

enum UserRole {
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN',
}
@Component({
    selector: 'xm-reports',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <xm-page-header text="i18n_reports" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <div class="report-category"><xm-rooms-report [rooms]="rooms()" /></div>
            <div class="report-category"><xm-exams-report [examNames]="examNames()" /></div>
            <div class="report-category"><xm-students-report [students]="students()" /></div>
            <div class="report-category"><xm-enrolments-report [examNames]="examNames()" /></div>
            <div class="report-category"><xm-answers-report /></div>
            <div class="report-category"><xm-reviews-report /></div>
            <div class="report-category"><xm-records-report /></div>
            <div class="report-category"><xm-teachers-report [teachers]="teachers()" /></div>
        </ng-template>
    `,
    imports: [
        RoomsReportComponent,
        ExamsReportComponent,
        StudentsReportComponent,
        EnrolmentsReportComponent,
        AnswersReportComponent,
        ReviewsReportComponent,
        RecordsReportComponent,
        TeachersReportComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    styleUrl: './reports.component.scss',
})
export class ReportsComponent {
    rooms = signal<Option<ExamRoom, number>[]>([]);
    examNames = signal<Option<string, number>[]>([]);
    teachers = signal<Option<User, number>[]>([]);
    students = signal<Option<User, number>[]>([]);

    private Users = inject(UserService);
    private Reports = inject(ReportsService);
    private Room = inject(RoomService);

    constructor() {
        this.Room.getRooms$().subscribe((resp) => {
            this.rooms.set(
                resp.map((r) => ({
                    id: r.id,
                    label: `${r.buildingName} - ${r.name}`,
                    value: { ...r },
                })),
            );
        });

        this.Reports.examNames().subscribe((resp) => {
            this.examNames.set(
                resp.map((en) => ({
                    id: en.id,
                    label: `${en.course.code} - ${en.name}`,
                    value: en.name,
                })),
            );
        });

        this.Users.listUsersByRole$(UserRole.TEACHER).subscribe((resp) => {
            this.teachers.set(
                resp.map((t) => ({
                    id: t.id,
                    label: t.firstName + ' ' + t.lastName,
                    value: t,
                })),
            );
        });

        this.Users.listUsersByRole$(UserRole.STUDENT).subscribe((resp) => {
            this.students.set(
                resp.map((s) => ({
                    id: s.id,
                    label: s.firstName + ' ' + s.lastName,
                    value: s,
                })),
            );
        });
    }
}
