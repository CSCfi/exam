import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarModule } from '../calendar/calendar.module';
import { SharedModule } from '../shared/shared.module';
import { SoftwareModule } from '../software/software.module';
import { AccessibilityModule } from './accessibility/accessibility.module';
import { AddressComponent } from './address/address.component';
import { FacilityComponent } from './facility.component';
import { MachineModule } from './machines/machines.module';
import { AvailabilityComponent } from './rooms/availability.component';
import { InteroperabilityService } from './rooms/interoperability.service';
import { MultiRoomComponent } from './rooms/room-mass-edit.component';
import { RoomComponent } from './rooms/room.component';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/rooms.component';
import { ExceptionDeleteDialogComponent } from './schedule/exception-delete-dialog.component';
import { ExceptionDialogComponent } from './schedule/exception-dialog.component';
import { ExceptionListComponent } from './schedule/exceptions.component';
import { MaintenancePeriodDialogComponent } from './schedule/maintenance-period-dialog.component';
import { OpenHoursComponent } from './schedule/opening-hours.component';
import { StartingTimeComponent } from './schedule/starting-time.component';

@NgModule({
    imports: [
        AccessibilityModule,
        MachineModule,
        TranslateModule,
        NgbModule,
        SharedModule,
        RouterModule,
        CalendarModule,
        SoftwareModule,
        FacilityComponent,
        ExceptionDeleteDialogComponent,
        ExceptionListComponent,
        OpenHoursComponent,
        StartingTimeComponent,
        RoomComponent,
        MultiRoomComponent,
        AvailabilityComponent,
        RoomListComponent,
        AddressComponent,
    ],
    declarations: [ExceptionDialogComponent, MaintenancePeriodDialogComponent],
    bootstrap: [ExceptionDialogComponent, MaintenancePeriodDialogComponent],
    providers: [RoomService, InteroperabilityService],
    exports: [FacilityComponent],
})
export class FacilityModule {}
