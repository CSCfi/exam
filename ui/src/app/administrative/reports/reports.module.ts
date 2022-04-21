import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FacilityModule } from '../../facility/facility.module';
import { SharedModule } from '../../shared/shared.module';
import { AnswersReportComponent } from './categories/answers-report.component';
import { EnrolmentsReportComponent } from './categories/enrolments-report.component';
import { ExamsReportComponent } from './categories/exams-report.component';
import { RecordsReportComponent } from './categories/records-report.component';
import { ReviewsReportComponent } from './categories/reviews-report.component';
import { RoomsReportComponent } from './categories/rooms-report.component';
import { StudentsReportComponent } from './categories/students-report.component';
import { TeachersReportComponent } from './categories/teachers-report.component';
import { ReportsComponent } from './reports.component';
import { ReportsService } from './reports.service';

@NgModule({
    imports: [SharedModule, CommonModule, TranslateModule, FacilityModule, NgbModule],
    declarations: [
        AnswersReportComponent,
        EnrolmentsReportComponent,
        ExamsReportComponent,
        RecordsReportComponent,
        ReviewsReportComponent,
        RoomsReportComponent,
        StudentsReportComponent,
        TeachersReportComponent,
        ReportsComponent,
    ],
    providers: [ReportsService, DatePipe],
})
export class ReportsModule {}
