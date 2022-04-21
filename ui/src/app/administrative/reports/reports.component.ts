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
import { RoomService } from '../../facility/rooms/room.service';
import { ExamRoom } from '../../reservation/reservation.model';
import { User } from '../../session/session.service';
import { Option } from '../../shared/select/dropdown-select.component';
import { UserService } from '../../shared/user/user.service';
import { ReportsService, UserRole } from './reports.service';

@Component({
    selector: 'xm-reports',
    template: `
        <div>
            <div id="sitnet-header" class="header">
                <div class="col-md-12 header-wrapper">
                    <span class="header-text">{{ 'sitnet_reports' | translate }}</span>
                </div>
            </div>

            <div id="dashboard">
                <div class="report-category" *ngIf="rooms"><xm-rooms-report [rooms]="rooms"></xm-rooms-report></div>
                <div class="report-category" *ngIf="examNames">
                    <xm-exams-report [examNames]="examNames" fileType="xlsx"></xm-exams-report>
                </div>
                <div class="report-category" *ngIf="students">
                    <xm-students-report [students]="students"></xm-students-report>
                </div>
                <div class="report-category" *ngIf="examNames">
                    <xm-enrolments-report [examNames]="examNames"></xm-enrolments-report>
                </div>
                <div class="report-category"><xm-answers-report></xm-answers-report></div>
                <div class="report-category"><xm-reviews-report></xm-reviews-report></div>
                <div class="report-category"><xm-records-report></xm-records-report></div>
                <div class="report-category" *ngIf="teachers">
                    <xm-teachers-report [teachers]="teachers"></xm-teachers-report>
                </div>
            </div>
        </div>
    `,
})
export class ReportsComponent implements OnInit {
    constructor(private Users: UserService, private Reports: ReportsService, private room: RoomService) {}

    rooms: Option<ExamRoom, number>[] = [];
    examNames: Option<string, number>[] = [];
    teachers: Option<User, number>[] = [];
    students: Option<User, number>[] = [];

    ngOnInit() {
        this.room.getRooms$().subscribe((resp) => {
            this.rooms = resp.map((r) => ({
                id: r.id,
                label: `${r.buildingName} - ${r.name}`,
                value: { ...r },
            }));
        });

        this.Reports.examNames().subscribe((resp) => {
            this.examNames = resp.map((en) => ({
                id: en.id,
                label: `${en.course.code} - ${en.name}`,
                value: en.name,
            }));
        });

        this.Users.listUsersByRole$(UserRole.TEACHER).subscribe((resp) => {
            this.teachers = resp.map((t) => ({
                id: t.id,
                label: t.name as string,
                value: t,
            }));
        });

        this.Users.listUsersByRole$(UserRole.STUDENT).subscribe((resp) => {
            this.students = resp.map((t) => ({
                id: t.id,
                label: t.name as string,
                value: t,
            }));
        });
    }
}
