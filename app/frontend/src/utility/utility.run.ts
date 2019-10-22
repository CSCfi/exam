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
import * as ng from 'angular';

export default function run($templateCache: ng.ITemplateCacheService) {
    'ngInject';
    // This is necessary because angular can't find the bundled uib-template unless added to template cache
    $templateCache.put(
        'uib/template/datepickerPopup/popup.html',
        // eslint-disable-next-line
        require('./date/template/uibPopupOverride.html')
    );
}
