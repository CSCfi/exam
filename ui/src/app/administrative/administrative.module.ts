import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SessionModule } from '../session/session.module';
import { UtilityModule } from '../utility/utility.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsComponent } from './settings/settings.component';
import { ExamStatisticsComponent } from './statistics/categories/examStatistics.component';
import { ReservationStatisticsComponent } from './statistics/categories/reservationStatistics.component';
import { ResponseStatisticsComponent } from './statistics/categories/responseStatistics.component';
import { RoomStatisticsComponent } from './statistics/categories/roomStatistics.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { UsersComponent } from './users/users.component';
import { UserManagementService } from './users/users.service';

@NgModule({
    declarations: [
        UsersComponent,
        SettingsComponent,
        ExamStatisticsComponent,
        ReservationStatisticsComponent,
        ResponseStatisticsComponent,
        RoomStatisticsComponent,
        StatisticsComponent,
    ],
    imports: [CommonModule, NgbModule, TranslateModule, SessionModule, UtilityModule, FormsModule, ReportsModule],
    providers: [UserManagementService],
})
export class AdministrativeModule {}
