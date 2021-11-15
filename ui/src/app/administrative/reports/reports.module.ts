import { CommonModule, DatePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { FacilityModule } from '../../facility/facility.module';
import { UtilityModule } from '../../utility/utility.module';
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

@NgModule({
    imports: [UtilityModule, CommonModule, TranslateModule, FacilityModule, NgbModule],
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
