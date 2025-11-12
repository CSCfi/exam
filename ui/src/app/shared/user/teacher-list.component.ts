// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherListComponent {
    exam = input<Personnel & { parent: Personnel | null }>();
    useParent = input(false);
    key = input<number | undefined>(undefined); // Forces Angular to create unique component instances

    get owners(): string {
        const examValue = this.exam();
        if (!examValue) return '';
        const ownerList = this.useParent() && examValue.parent ? examValue.parent.examOwners : examValue.examOwners;
        if (!ownerList || ownerList.length === 0) return '';
        if (ownerList.filter((o) => o?.lastName).length > 0) {
            return ownerList.map((o) => `${o.firstName} ${o.lastName}`).join(', ');
        }
        return '';
    }

    get inspectors(): string {
        const examValue = this.exam();
        if (!examValue) return '';
        const inspectorList = examValue.examInspections ? examValue.examInspections.map((ei) => ei.user) : [];
        return inspectorList
            .filter((i) => i)
            .map((i) => `${i.firstName} ${i.lastName}`)
            .join(', ');
    }
}
