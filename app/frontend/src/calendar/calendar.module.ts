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
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { UtilityModule } from '../utility/utility.module';
import { BookingCalendarComponent } from './bookingCalendar.component';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';
import * as ac from 'angular-calendar';
import { DateAdapter } from 'angular-calendar';

import 'angular-calendar/css/angular-calendar.css';
import { UIRouterModule } from '@uirouter/angular';

@NgModule({
    imports: [
        NgbModule,
        ac.CalendarModule.forRoot({
            provide: DateAdapter,
            useFactory: adapterFactory,
        }),
        UIRouterModule,
        UtilityModule,
    ],
    declarations: [BookingCalendarComponent, CalendarComponent],
    entryComponents: [CalendarComponent],
    providers: [CalendarService],
})
export class CalendarModule {}
