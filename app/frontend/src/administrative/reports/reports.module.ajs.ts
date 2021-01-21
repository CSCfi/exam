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
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';
import { AnswersReportComponent } from './categories/answersReport.component';
import { EnrolmentsReportComponent } from './categories/enrolmentsReport.component';
import { ExamsReportComponent } from './categories/examsReport.component';
import { RecordsReportComponent } from './categories/recordsReport.component';
import { ReviewsReportComponent } from './categories/reviewsReport.component';
import { RoomsReportComponent } from './categories/roomsReport.component';
import { StudentsReportComponent } from './categories/studentsReport.component';
import { TeachersReportComponent } from './categories/teachersReport.component';
import { ReportsComponent } from './reports.component';
import { ReportsService } from './reports.service';
import { UserResourceService } from './userResource.service';

angular
    .module('app.administrative.reports', [])
    .service('Reports', downgradeInjectable(ReportsService))
    .service('UserRes', downgradeInjectable(UserResourceService))
    .directive('answers-report', downgradeComponent({ component: AnswersReportComponent }))
    .directive('enrolments-report', downgradeComponent({ component: EnrolmentsReportComponent }))
    .directive('exams-report', downgradeComponent({ component: ExamsReportComponent }))
    .directive('records-report', downgradeComponent({ component: RecordsReportComponent }))
    .directive('reviews-report', downgradeComponent({ component: ReviewsReportComponent }))
    .directive('rooms-report', downgradeComponent({ component: RoomsReportComponent }))
    .directive('students-report', downgradeComponent({ component: StudentsReportComponent }))
    .directive('teachers-report', downgradeComponent({ component: TeachersReportComponent }))
    .directive('reports', downgradeComponent({ component: ReportsComponent }));
