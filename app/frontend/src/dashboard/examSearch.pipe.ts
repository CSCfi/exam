/*
 * Copyright (c) 2018 Exam Consortium
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
import { Pipe, PipeTransform } from '@angular/core';

import { Exam } from '../exam/exam.model';

@Pipe({ name: 'examSearch' })
export class ExamSearchPipe implements PipeTransform {

    private getAggregate = (exam: Exam) => {
        const code = exam.course ? exam.course.code : '';
        const owners = exam.examOwners.map(eo => `${eo.firstName} ${eo.lastName}`).join(' ');
        return `${code} ${owners} ${exam.name}`;
    }

    transform = (exams: Exam[], filter: string): Exam[] =>
        !filter ? exams : exams.filter(e => this.getAggregate(e).toLowerCase().includes(filter.toLowerCase()))


}
