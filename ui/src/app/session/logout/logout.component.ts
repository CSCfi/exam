// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-logout',
    template: '<div></div>',
    standalone: true,
})
export class LogoutComponent implements OnInit {
    private Session = inject(SessionService);

    ngOnInit() {
        this.Session.logout();
    }
}
