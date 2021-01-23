import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

import { SessionModule } from '../session/session.module';
import { UsersComponent } from './users/users.component';
import { UtilityModule } from '../utility/utility.module';
import { UserManagementService } from './users/users.service';
import { SettingsComponent } from './settings/settings.component';
import { CommonModule } from '@angular/common';
import { ExamStatisticsComponent } from './statistics/categories/examStatistics.component';
import { ReservationStatisticsComponent } from './statistics/categories/reservationStatistics.component';
import { ResponseStatisticsComponent } from './statistics/categories/responseStatistics.component';
import { RoomStatisticsComponent } from './statistics/categories/roomStatistics.component';
import { StatisticsComponent } from './statistics/statistics.component';

@NgModule({
    entryComponents: [UsersComponent, SettingsComponent, StatisticsComponent],
    declarations: [
        UsersComponent,
        SettingsComponent,
        ExamStatisticsComponent,
        ReservationStatisticsComponent,
        ResponseStatisticsComponent,
        RoomStatisticsComponent,
        StatisticsComponent,
    ],
    imports: [CommonModule, NgbModule, TranslateModule, SessionModule, UtilityModule, FormsModule],
    providers: [UserManagementService],
})
export class AdministrativeModule {}
