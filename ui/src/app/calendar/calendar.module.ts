/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgbCollapseModule, NgbDropdownModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../shared/shared.module';
import { BookingCalendarComponent } from './booking-calendar.component';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';
import { CalendarExamInfoComponent } from './helpers/exam-info.component';
import { OptionalSectionsComponent } from './helpers/optional-sections.component';
import { OrganisationPickerComponent } from './helpers/organisation-picker.component';
import { SelectedRoomComponent } from './helpers/selected-room.component';
import { SlotPickerComponent } from './helpers/slot-picker.component';

@NgModule({
    imports: [
        FullCalendarModule,
        RouterModule,
        NgbPopoverModule,
        NgbDropdownModule,
        NgbCollapseModule,
        SharedModule,
        BookingCalendarComponent,
        CalendarComponent,
        CalendarExamInfoComponent,
        OptionalSectionsComponent,
        OrganisationPickerComponent,
        SlotPickerComponent,
        SelectedRoomComponent,
    ],
    providers: [CalendarService],
    exports: [CalendarComponent, BookingCalendarComponent],
})
export class CalendarModule {}
