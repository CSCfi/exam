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
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';

import { CollaborativeExamService } from '../collaborative/collaborativeExam.service';
import { BasicExamInfoComponent } from './basic/basicExamInfo.component';
import { ExamCourseComponent } from './basic/examCourse.component';
import { CoursePickerComponent } from './common/coursePicker.component';
import { CoursePickerService } from './common/coursePicker.service';
import { LanguageSelectorComponent } from './common/languageSelector.component';
import { CourseSelectionComponent } from './creation/courseSelection.component';
import { NewExamComponent } from './creation/newExam.component';
import { ExaminationEventDialogComponent } from './events/examinationEventDialog.component';
import { CollaborativeExamOwnerSelectorComponent } from './publication/collaborativeExamOwnerSelector.component';
import { ExamPublicationComponent } from './publication/examPublication.component';
import { SectionsListComponent } from './sections/sectionsList.component';

require('../../facility');
require('../../software');
require('../../review');
require('../../examination');
require('../../question');

angular
    .module('app.exam.editor', ['app.facility', 'app.software', 'app.review', 'app.examination', 'app.question'])
    .service('Course', downgradeInjectable(CoursePickerService))
    .service('CollaborativeExam', downgradeInjectable(CollaborativeExamService))
    .directive('basicExamInfo', downgradeComponent({ component: BasicExamInfoComponent }))
    .directive('examCourse', downgradeComponent({ component: ExamCourseComponent }))
    .directive('coursePicker', downgradeComponent({ component: CoursePickerComponent }))
    .directive('languageSelector', downgradeComponent({ component: LanguageSelectorComponent }))
    .directive('courseSelection', downgradeComponent({ component: CourseSelectionComponent }))
    .directive('newExam', downgradeComponent({ component: NewExamComponent }))
    .directive('examPublication', downgradeComponent({ component: ExamPublicationComponent }))
    .directive('sections', downgradeComponent({ component: SectionsListComponent }))
    .directive(
        'collaborativeExamOwnerSelector',
        downgradeComponent({ component: CollaborativeExamOwnerSelectorComponent }),
    )
    .directive('examinationEventDialog', downgradeComponent({ component: ExaminationEventDialogComponent }));
