// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'xm-staff-dashboard',
    template: `<router-outlet></router-outlet>`,
    imports: [RouterOutlet],
})
export class StaffDashboardComponent {}
