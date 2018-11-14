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

import * as angular from 'angular';
import { ExamService } from './exam.service';
import { downgradeInjectable } from '@angular/upgrade/static';

require('./editor/editor.module.ts');
require('../facility/facility.module');
require('../review/review.module');
require('../examination/examination.module');
require('../question');

angular.module('app.exam', ['app.exam.editor', 'app.facility', 'app.review', 'app.examination', 'app.question'])
    .service('Exam', downgradeInjectable(ExamService));

