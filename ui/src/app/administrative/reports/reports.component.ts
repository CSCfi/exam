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

import { RoomService } from '../../facility/rooms/room.service';
import { ReportsService } from './reports.service';
import { UserResourceService, UserRole } from './userResource.service';

export interface Category {
    id: number;
    label: string;
    value: Record<string, unknown>;
}

@Component({
    selector: 'app-reports',
    template: `
        <div>
            <div id="sitnet-header" class="header">
                <div class="col-md-12 header-wrapper">
                    <span class="header-text">{{ 'sitnet_reports' | translate }}</span>
                </div>
            </div>

            <div id="dashboard">
                <div class="report-category" *ngIf="rooms"><app-rooms-report [rooms]="rooms"></app-rooms-report></div>
                <div class="report-category" *ngIf="examNames">
                    <app-exams-report [examNames]="examNames" fileType="xlsx"></app-exams-report>
                </div>
                <div class="report-category" *ngIf="students">
                    <app-students-report [students]="students"></app-students-report>
                </div>
                <div class="report-category" *ngIf="examNames">
                    <app-enrolments-report [examNames]="examNames"></app-enrolments-report>
                </div>
                <div class="report-category"><app-answers-report></app-answers-report></div>
                <div class="report-category"><app-reviews-report></app-reviews-report></div>
                <div class="report-category"><app-records-report></app-records-report></div>
                <div class="report-category" *ngIf="teachers">
                    <app-teachers-report [teachers]="teachers"></app-teachers-report>
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
        this.room.getRooms().subscribe((resp) => {
            this.rooms = resp.map((r) => ({
                id: r.id,
                label: `${r.buildingName} - ${r.name}`,
                value: { ...r },
            }));
        });

        this.reports.examNames().subscribe((resp) => {
            this.examNames = resp.map((en) => ({
                id: en.id,
                label: `${en.course.code} - ${en.name}`,
                value: { ...en },
            }));
        });

        this.userResource.usersByRole(UserRole.TEACHER).subscribe((resp) => {
            this.teachers = resp.map((t) => ({
                id: t.id,
                label: t.name as string,
                value: { ...t },
            }));
        });

        this.userResource.usersByRole(UserRole.STUDENT).subscribe((resp) => {
            this.students = resp.map((t) => ({
                id: t.id,
                label: t.name as string,
                value: { ...t },
            }));
        });
    }
}
