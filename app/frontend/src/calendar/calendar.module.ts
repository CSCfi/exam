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
import '@fullcalendar/core/locales/fi';
import '@fullcalendar/core/locales/sv';
import '@fullcalendar/core/main.min.css';
import '@fullcalendar/daygrid/main.min.css';
import '@fullcalendar/timegrid/main.min.css';

import { NgModule } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { UtilityModule } from '../utility/utility.module';
import { BookingCalendarComponent } from './bookingCalendar.component';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';

@NgModule({
    imports: [FullCalendarModule, NgbModule, UtilityModule],
    declarations: [BookingCalendarComponent, CalendarComponent],
    entryComponents: [CalendarComponent, BookingCalendarComponent],
    providers: [CalendarService],
})
export class CalendarModule {}
