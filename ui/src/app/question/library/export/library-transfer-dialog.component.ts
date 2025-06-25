// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import {
    NgbActiveModal,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap';
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
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, TranslateModule],
})
export class LibraryTransferDialogComponent implements OnInit {
    @Input() selections: number[] = [];
    organisations: Organisation[] = [];
    organisation?: Organisation;
    showOrganisationSelection = false;

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            this.organisations = resp.filter((org) => !org.homeOrg);
        });
    }

    transfer = () => {
        if (this.selections.length == 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
        } else {
            this.http
                .post('/app/iop/export', {
                    type: 'QUESTION',
                    orgRef: this.organisation?._id,
                    ids: this.selections,
                })
                .subscribe({
                    next: () => this.toast.info(this.translate.instant('i18n_questions_transferred')),
                    error: (err) => this.toast.error(err),
                });
        }
    };
}
