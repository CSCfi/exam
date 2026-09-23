// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReservationsComponent } from 'src/app/reservation/reservations.component';

@Component({
    selector: 'xm-admin-dashboard',
    template: '<xm-reservations></xm-reservations>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReservationsComponent],
})
export class AdminDashboardComponent {}
