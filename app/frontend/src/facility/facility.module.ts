import { NgModule } from '@angular/core';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { MachineModule } from './machines/machines.module';
import { ExamRoomsAdminTabsComponent } from './examRoomsAdminTabs.component';
import { ExceptionDialogComponent } from './schedule/exceptionDialog.component';
import { ExceptionListComponent } from './schedule/exceptionList.component';
import { OpenHoursComponent } from './schedule/openHours.component';
import { StartingTimeComponent } from './schedule/startingTime.component';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule, NgbTabsetModule } from '@ng-bootstrap/ng-bootstrap';
import { UtilityModule } from '../utility/utility.module';
import { ExceptionListAllComponent } from './rooms/exceptionListAll.component';
import { RoomComponent } from './rooms/room.component';
import { MultiRoomComponent } from './rooms/multiRoom.component';
import { AvailabilityComponent } from './rooms/availability.component';
import { RoomListComponent } from './rooms/roomList.component';
import { CommonModule } from '@angular/common';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';
import { CalendarModule } from '../calendar/calendar.module';
import { SettingsResourceService } from './rooms/settingsResource';
import { InteroperabilityResourceService } from './rooms/interoperabilityResource.service';
import { RoomService } from './rooms/room.service';
import { FormsModule } from '@angular/forms';
import { AddressComponent } from './address/address.component';
import { SoftwareModule } from '../software/software.module';

@NgModule({
    imports: [
        AccessibilityModule,
        MachineModule,
        TranslateModule,
        NgbModule,
        NgbTabsetModule,
        UtilityModule,
        CommonModule,
        UIRouterUpgradeModule,
        CalendarModule,
        FormsModule,
        SoftwareModule,
    ],
    entryComponents: [
        ExamRoomsAdminTabsComponent,
        ExceptionDialogComponent,
        ExceptionListComponent,
        OpenHoursComponent,
        StartingTimeComponent,
        ExceptionListAllComponent,
        RoomComponent,
        MultiRoomComponent,
        AvailabilityComponent,
        RoomListComponent,
        AddressComponent,
    ],
    declarations: [
        ExamRoomsAdminTabsComponent,
        ExceptionDialogComponent,
        ExceptionListComponent,
        OpenHoursComponent,
        StartingTimeComponent,
        ExceptionListAllComponent,
        RoomComponent,
        MultiRoomComponent,
        AvailabilityComponent,
        RoomListComponent,
        AddressComponent,
    ],
    providers: [SettingsResourceService, InteroperabilityResourceService, RoomService],
    exports: [ExamRoomsAdminTabsComponent],
})
export class FacilityModule {}
