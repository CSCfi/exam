import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { UIRouterModule } from '@uirouter/angular';
import { CalendarModule } from '../calendar/calendar.module';
import { SharedModule } from '../shared/shared.module';
import { SoftwareModule } from '../software/software.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { AddressComponent } from './address/address.component';
import { FacilityComponent } from './facility.component';
import { MachineModule } from './machines/machines.module';
import { AvailabilityComponent } from './rooms/availability.component';
import { ExceptionListAllComponent } from './rooms/exception-mass-edit.component';
import { InteroperabilityService } from './rooms/interoperability.service';
import { MultiRoomComponent } from './rooms/room-mass-edit.component';
import { RoomComponent } from './rooms/room.component';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/rooms.component';
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
        SharedModule,
        CommonModule,
        UIRouterModule,
        CalendarModule,
        FormsModule,
        SoftwareModule,
    ],
    declarations: [
        FacilityComponent,
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
    providers: [RoomService, InteroperabilityService],
    exports: [FacilityComponent],
})
export class FacilityModule {}
