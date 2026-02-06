// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import type { ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

type Personnel = { examInspections: ExamInspection[]; examOwners: User[] };
@Component({
    selector: 'xm-teacher-list',
    template: `
        <span>
            <span class="fw-bold">{{ owners }}</span>
            @if (inspectors) {
                <span>, {{ inspectors }}</span>
            }
        </span>
    `,
    imports: [],
})
export class TeacherListComponent {
    @Input() exam!: Personnel & { parent: Personnel | null };
    @Input() useParent = false;
    @Input() key?: number; // Forces Angular to create unique component instances

    get owners(): string {
        if (!this.exam) return '';
        const ownerList = this.useParent && this.exam.parent ? this.exam.parent.examOwners : this.exam.examOwners;
        if (!ownerList || ownerList.length === 0) return '';
        if (ownerList.filter((o) => o?.lastName).length > 0) {
            return ownerList.map((o) => `${o.firstName} ${o.lastName}`).join(', ');
        }
        return '';
    }

    get inspectors(): string {
        if (!this.exam) return '';
        const inspectorList = this.exam.examInspections ? this.exam.examInspections.map((ei) => ei.user) : [];
        return inspectorList
            .filter((i) => i)
            .map((i) => `${i.firstName} ${i.lastName}`)
            .join(', ');
    }
}
