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

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';

type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
};

@Component({
    selector: 'xm-exam-organisation-selector',
    template: `<div class="row mt-2">
            <div class="col-md-3 ">
                {{ 'i18n_exam_organisations' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_exam_organisations_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="exam organisations" />
                </sup>
            </div>
            <div class="col-md-9" ngbDropdown>
                <button
                    ngbDropdownToggle
                    [disabled]="exam.state === 'PUBLISHED'"
                    class="btn btn-outline-dark"
                    type="button"
                    id="dropDownMenu21"
                    aria-haspopup="true"
                    aria-expanded="true"
                >
                    {{ 'i18n_faculty_name' | translate }}&nbsp;
                </button>
                <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu21">
                    @for (org of organisations; track org) {
                        <li role="presentation">
                            <button
                                [disabled]="org.filtered"
                                ngbDropdownItem
                                (click)="addOrganisation(org)"
                                role="menuitem"
                            >
                                {{ org.code }} ({{ org.name }})
                            </button>
                        </li>
                    }
                </ul>
            </div>
        </div>
        @if (selectedOrganisations.length > 0) {
            <div class="row mt-2">
                <div class="col-md-9 offset-md-3">
                    @for (org of selectedOrganisations; track org) {
                        {{ org.name }} ({{ org.code }})
                        <button
                            class="btn btn-sm btn-link px-0"
                            [disabled]="exam.state === 'PUBLISHED'"
                            (click)="removeOrganisation(org)"
                            title="{{ 'i18n_remove' | translate }}"
                        >
                            <i
                                class="bi bi-x-lg"
                                [ngClass]="exam.state === 'PUBLISHED' ? 'text-danger' : 'text-success'"
                            ></i>
                        </button>
                    }
                </div>
            </div>
        }`,
    standalone: true,
    imports: [NgClass, NgbPopover, NgbDropdownModule, TranslateModule],
})
export class OrganisationSelectorComponent implements OnInit {
    @Input() exam!: Exam;

    organisations: Organisation[] = [];
    selectedOrganisations: Organisation[] = [];

    constructor(
        private http: HttpClient,
        private Exam: ExamService,
    ) {}

    ngOnInit() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            const organisations = resp.filter((org) => !org.homeOrg);
            this.selectedOrganisations = organisations.filter(
                (o) => this.exam.organisations && this.exam.organisations.split(';').includes(o._id),
            );
            const filtered = this.selectedOrganisations.map((o) => o._id);
            this.organisations = organisations.map((o) => ({ ...o, filtered: filtered.includes(o._id) }));
        });
    }

    addOrganisation = (organisation: Organisation) => {
        if (!this.exam.organisations) {
            this.exam.organisations = organisation._id;
        } else if (!this.exam.organisations.includes(organisation._id)) {
            this.exam.organisations = `${this.exam.organisations};${organisation._id}`;
        } else {
            return;
        }
        this.Exam.updateExam$(this.exam, {}, true).subscribe(() => {
            this.selectedOrganisations.push(organisation);
            organisation.filtered = true;
        });
    };

    removeOrganisation = (organisation: Organisation) => {
        if (!this.exam.organisations || !this.exam.organisations.includes(organisation._id)) {
            return;
        } else if (this.exam.organisations.includes(';' + organisation._id)) {
            this.exam.organisations = this.exam.organisations.replace(';' + organisation._id, '');
        } else if (this.exam.organisations.includes(organisation._id)) {
            this.exam.organisations = this.exam.organisations.replace(organisation._id, '');
        } else {
            return;
        }
        this.Exam.updateExam$(this.exam, {}, true).subscribe(() => {
            this.selectedOrganisations.splice(this.selectedOrganisations.indexOf(organisation), 1);
            organisation.filtered = false;
        });
    };
}
