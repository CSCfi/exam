// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

type Organisation = {
    _id: string;
    name: string;
    homeOrg: boolean;
    code: string;
};

@Component({
    selector: 'xm-library-transfer',
    templateUrl: './library-transfer-dialog.component.html',
    imports: [NgbDropdownModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryTransferDialogComponent {
    readonly selections = signal<number[]>([]); // Set by modal opening component
    readonly organisations = signal<Organisation[]>([]);
    readonly organisation = signal<Organisation | undefined>(undefined);

    protected readonly activeModal = inject(NgbActiveModal);

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    constructor() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            this.organisations.set(resp.filter((org) => !org.homeOrg));
        });
    }

    transfer = () => {
        if (this.selections().length == 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
        } else {
            this.http
                .post('/app/iop/export', {
                    type: 'QUESTION',
                    orgRef: this.organisation()?._id,
                    ids: this.selections(),
                })
                .subscribe({
                    next: () => this.toast.info(this.translate.instant('i18n_questions_transferred')),
                    error: (err) => this.toast.error(err),
                });
        }
    };
}
