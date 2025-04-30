// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SebApiService } from 'src/app/shared/services/seb-api.service';

@Component({
    selector: 'xm-waitingroom',
    templateUrl: './waitingroom.component.html',
    standalone: true,
    imports: [TranslateModule, CommonModule],
})
export class WaitingroomComponent implements OnInit {
    constructor(
        public route: ActivatedRoute,
        private router: Router,
        private SebApi: SebApiService,
    ) {}

    ngOnInit() {
        const error = this.route.snapshot.queryParams['error'];
        if (error === 'seb_config_mismatch') {
            // Handle SEB configuration mismatch error
            this.handleSebConfigMismatch();
        }
    }

    private handleSebConfigMismatch(): void {
        // You can add specific error handling here, such as showing a message to the user
        // about the SEB configuration mismatch
        console.error('SEB configuration mismatch detected');
    }
}
