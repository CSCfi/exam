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

import { ReportsService } from './reports.service';
import { UserResourceService, UserRole } from './userResource.service';
import { RoomService } from '../../facility/rooms/room.service';

interface Category {
    id: number;
    label: string;
    value: any;
}

@Component({
    selector: 'reports',
    template: `
        <div>
            <div id="sitnet-header" class="header">
                <div class="col-md-12 header-wrapper">
                    <span class="header-text">{{ 'sitnet_reports' | translate }}</span>
                </div>
            </div>

            <div id="dashboard">
                <div class="report-category" *ngIf="rooms"><rooms-report [rooms]="rooms"></rooms-report></div>
                <div class="report-category" *ngIf="examNames">
                    <exams-report [examNames]="examNames" [fileType]="xlsx"></exams-report>
                </div>
                <div class="report-category" *ngIf="students">
                    <students-report [students]="students"></students-report>
                </div>
                <div class="report-category" *ngIf="examNames">
                    <enrolments-report [examNames]="examNames"></enrolments-report>
                </div>
                <div class="report-category"><answers-report></answers-report></div>
                <div class="report-category"><reviews-report></reviews-report></div>
                <div class="report-category"><records-report></records-report></div>
                <div class="report-category" *ngIf="teachers">
                    <teachers-report [teachers]="teachers"></teachers-report>
                </div>
            </div>
        </div>
    `,
})
export class ReportsComponent implements OnInit {
    constructor(
        private reports: ReportsService,
        private room: RoomService,
        private userResource: UserResourceService,
    ) {}

    rooms: Category[];
    examNames: Category[];
    teachers: Category[];
    students: Category[];

    ngOnInit() {
        this.room.getRooms().subscribe(resp => {
            this.rooms = resp.map(r => ({
                id: r.id,
                label: `${r.buildingName} - ${r.name}`,
                value: { ...r },
            }));
        });

        this.reports.examNames().subscribe(resp => {
            this.examNames = resp.map(en => ({
                id: en.id,
                label: `${en.course.code} - ${en.name}`,
                value: { ...en },
            }));
        });

        this.userResource.usersByRole(UserRole.TEACHER).subscribe(resp => {
            this.teachers = resp.map(t => ({
                id: t.id,
                label: t.name as string,
                value: { ...t },
            }));
        });

        this.userResource.usersByRole(UserRole.STUDENT).subscribe(resp => {
            this.students = resp.map(t => ({
                id: t.id,
                label: t.name as string,
                value: { ...t },
            }));
        });
    }
}
