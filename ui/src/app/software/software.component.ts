// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { Software } from 'src/app/facility/facility.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { SoftwareService } from './software.service';

@Component({
    selector: 'xm-software',
    templateUrl: './software.component.html',
    standalone: true,
    imports: [FormsModule, TranslateModule, OrderByPipe],
})
export class SoftwareComponent implements OnInit {
    software: (Software & { showName: boolean })[] = [];
    newSoftware = { name: '' };

    constructor(private softwareService: SoftwareService) {}

    ngOnInit() {
        this.softwareService
            .listSoftware$()
            .pipe(catchError(() => of([])))
            .subscribe((resp) => (this.software = resp.map((r) => ({ ...r, showName: false }))));
    }

    updateSoftware = (software: Software) =>
        this.softwareService
            .updateSoftware$(software)
            .pipe(catchError(() => of(void 0)))
            .subscribe();

    addSoftware = () => {
        const trimmedName = this.newSoftware.name.trim();
        if (!trimmedName) {
            return;
        }

        this.softwareService
            .addSoftware$(trimmedName)
            .pipe(
                catchError(() => {
                    return of(null);
                }),
            )
            .subscribe((resp) => {
                if (resp) {
                    this.software.push({ ...resp, showName: false });
                    this.newSoftware.name = '';
                }
            });
    };

    removeSoftware = (software: Software & { showName: boolean }) => {
        this.softwareService
            .removeSoftware$(software)
            .pipe(catchError(() => of(null)))
            .subscribe((resp) => {
                if (resp !== null) {
                    const index = this.software.indexOf(software);
                    if (index !== -1) {
                        this.software.splice(index, 1);
                    }
                }
            });
    };
}
