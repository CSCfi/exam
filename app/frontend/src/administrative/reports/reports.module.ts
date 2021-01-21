import { NgModule } from '@angular/core';

import { AnswersReportComponent } from './categories/answersReport.component';
import { EnrolmentsReportComponent } from './categories/enrolmentsReport.component';
import { UtilityModule } from '../../utility/utility.module';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RoomsModule } from '../../facility/rooms/rooms.module';
import { ReportsService } from './reports.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ExamsReportComponent } from './categories/examsReport.component';
import { RecordsReportComponent } from './categories/recordsReport.component';
import { ReviewsReportComponent } from './categories/reviewsReport.component';
import { RoomsReportComponent } from './categories/roomsReport.component';
import { StudentsReportComponent } from './categories/studentsReport.component';
import { TeachersReportComponent } from './categories/teachersReport.component';
import { UserResourceService } from './userResource.service';
import { ReportsComponent } from './reports.component';

@NgModule({
    entryComponents: [ReportsComponent],
    imports: [UtilityModule, CommonModule, TranslateModule, RoomsModule, NgbModule],
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
    providers: [ReportsService, UserResourceService, DatePipe],
})
export class ReportsModule {}
