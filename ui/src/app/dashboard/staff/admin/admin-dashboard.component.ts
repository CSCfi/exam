/*
 * Copyright (c) 2017 Exam Consortium
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
import { Component } from '@angular/core';
import { ReservationsComponent } from 'src/app/reservation/reservations.component';

@Component({
    selector: 'xm-admin-dashboard',
    template: '<xm-reservations></xm-reservations>',
    standalone: true,
    imports: [ReservationsComponent],
})
export class AdminDashboardComponent {}
