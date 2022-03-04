import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterModule } from '@uirouter/angular';

import { CalendarModule } from '../calendar/calendar.module';
import { SoftwareModule } from '../software/software.module';
import { UtilityModule } from '../utility/utility.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { AddressComponent } from './address/address.component';
import { ExamRoomsAdminTabsComponent } from './examRoomsAdminTabs.component';
import { MachineModule } from './machines/machines.module';
import { AvailabilityComponent } from './rooms/availability.component';
import { ExceptionListAllComponent } from './rooms/exceptionListAll.component';
import { InteroperabilityService } from './rooms/interoperability.service';
import { MultiRoomComponent } from './rooms/multiRoom.component';
import { RoomComponent } from './rooms/room.component';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/roomList.component';
import { SettingsResourceService } from './rooms/settingsResource';
import { ExceptionDialogComponent } from './schedule/exceptionDialog.component';
import { ExceptionListComponent } from './schedule/exceptionList.component';
import { MaintenancePeriodDialogComponent } from './schedule/maintenancePeriodDialog.component';
import { OpenHoursComponent } from './schedule/openHours.component';
import { StartingTimeComponent } from './schedule/startingTime.component';

@NgModule({
    imports: [
        AccessibilityModule,
        MachineModule,
        TranslateModule,
        NgbModule,
        NgbNavModule,
        UtilityModule,
        CommonModule,
        UIRouterModule,
        CalendarModule,
        FormsModule,
        SoftwareModule,
    ],
    declarations: [
        ExamRoomsAdminTabsComponent,
        ExceptionDialogComponent,
        ExceptionListComponent,
        MaintenancePeriodDialogComponent,
        OpenHoursComponent,
        StartingTimeComponent,
        ExceptionListAllComponent,
        RoomComponent,
        MultiRoomComponent,
        AvailabilityComponent,
        RoomListComponent,
        AddressComponent,
    ],
    bootstrap: [ExceptionDialogComponent, MaintenancePeriodDialogComponent],
    providers: [SettingsResourceService, RoomService, InteroperabilityService],
    exports: [ExamRoomsAdminTabsComponent],
})
export class FacilityModule {}
