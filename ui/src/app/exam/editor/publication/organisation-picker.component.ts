// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
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
                    [disabled]="exam().state === 'PUBLISHED'"
                    class="btn btn-outline-dark"
                    type="button"
                    id="dropDownMenu21"
                    aria-haspopup="true"
                    aria-expanded="true"
                >
                    {{ 'i18n_faculty_name' | translate }}&nbsp;
                </button>
                <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu21">
                    @for (org of organisations(); track org) {
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
        @if (selectedOrganisations().length > 0) {
            <div class="row mt-2">
                <div class="col-md-9 offset-md-3">
                    @for (org of selectedOrganisations(); track org) {
                        {{ org.name }} ({{ org.code }})
                        <button
                            class="btn btn-sm btn-link px-0"
                            [disabled]="exam().state === 'PUBLISHED'"
                            (click)="removeOrganisation(org)"
                            title="{{ 'i18n_remove' | translate }}"
                        >
                            <i
                                class="bi bi-x-lg"
                                [ngClass]="exam().state === 'PUBLISHED' ? 'text-danger' : 'text-success'"
                            ></i>
                        </button>
                    }
                </div>
            </div>
        }`,
    imports: [NgClass, NgbPopover, NgbDropdownModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationSelectorComponent {
    exam = input.required<Exam>();

    organisations = signal<Organisation[]>([]);
    selectedOrganisations = signal<Organisation[]>([]);

    private http = inject(HttpClient);
    private Exam = inject(ExamService);
    private allOrganisations: Organisation[] = [];

    constructor() {
        this.http.get<Organisation[]>('/app/iop/organisations').subscribe((resp) => {
            this.allOrganisations = resp.filter((org) => !org.homeOrg);
            this.updateOrganisations(this.exam());
        });

        effect(() => this.updateOrganisations(this.exam()));
    }

    addOrganisation(organisation: Organisation) {
        const currentExam = this.exam();
        if (!currentExam.organisations) {
            currentExam.organisations = organisation._id;
        } else if (!currentExam.organisations.includes(organisation._id)) {
            currentExam.organisations = `${currentExam.organisations};${organisation._id}`;
        } else {
            return;
        }
        this.Exam.updateExam$(currentExam, {}, true).subscribe(() => {
            this.selectedOrganisations.update((selected) => [...selected, organisation]);
            this.organisations.update((orgs) =>
                orgs.map((o) => (o._id === organisation._id ? { ...o, filtered: true } : o)),
            );
        });
    }

    removeOrganisation(organisation: Organisation) {
        const currentExam = this.exam();
        if (!currentExam.organisations || !currentExam.organisations.includes(organisation._id)) {
            return;
        } else if (currentExam.organisations.includes(';' + organisation._id)) {
            currentExam.organisations = currentExam.organisations.replace(';' + organisation._id, '');
        } else if (currentExam.organisations.includes(organisation._id)) {
            currentExam.organisations = currentExam.organisations.replace(organisation._id, '');
        } else {
            return;
        }
        this.Exam.updateExam$(currentExam, {}, true).subscribe(() => {
            this.selectedOrganisations.update((selected) => selected.filter((o) => o._id !== organisation._id));
            this.organisations.update((orgs) =>
                orgs.map((o) => (o._id === organisation._id ? { ...o, filtered: false } : o)),
            );
        });
    }

    private updateOrganisations(exam: Exam) {
        if (this.allOrganisations.length === 0) return;
        const selected = this.allOrganisations.filter(
            (o) => exam.organisations && exam.organisations.split(';').includes(o._id),
        );
        this.selectedOrganisations.set(selected);
        const filtered = selected.map((o) => o._id);
        this.organisations.set(this.allOrganisations.map((o) => ({ ...o, filtered: filtered.includes(o._id) })));
    }
}
