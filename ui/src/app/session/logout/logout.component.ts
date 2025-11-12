// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-logout',
    template: '<div></div>',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutComponent {
    private Session = inject(SessionService);

    constructor() {
        this.Session.logout();
    }
}
