import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SessionModule } from '../session/session.module';
import { SharedModule } from '../shared/shared.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsComponent } from './settings/settings.component';
import { SettingsService } from './settings/settings.service';
import { ExamStatisticsComponent } from './statistics/categories/exam-statistics.component';
import { ReservationStatisticsComponent } from './statistics/categories/reservation-statistics.component';
import { ResponseStatisticsComponent } from './statistics/categories/response-statistics.component';
import { RoomStatisticsComponent } from './statistics/categories/room-statistics.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { StatisticsService } from './statistics/statistics.service';
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
    imports: [CommonModule, NgbModule, TranslateModule, SessionModule, SharedModule, FormsModule, ReportsModule],
    providers: [UserManagementService, SettingsService, StatisticsService],
})
export class AdministrativeModule {}
