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
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import * as ac from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { UtilityModule } from '../utility/utility.module';
import { BookingCalendarComponent } from './bookingCalendar.component';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';
import { CalendarExamInfoComponent } from './helpers/calendarExamInfo.component';
import { OptionalSectionsComponent } from './helpers/optionalSections.component';
import { OrganisationPickerComponent } from './helpers/organisationPicker.component';
import { SelectedRoomComponent } from './helpers/selectedRoom.component';
import { SlotPickerComponent } from './helpers/slotPicker.component';

@NgModule({
    imports: [
        NgbModule,
        ac.CalendarModule.forRoot({
            provide: ac.DateAdapter,
            useFactory: adapterFactory,
        }),
        UIRouterModule,
        UtilityModule,
    ],
    declarations: [
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
