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
import { SessionService } from './session/session.service';
import * as _ from 'lodash';

export default function run($http: angular.IHttpService, $sessionStorage, Session: SessionService) {
    'ngInject';

    const user = $sessionStorage['EXAM_USER'];
    if (user) {
        if (!user.loginRole) {
            // This happens if user refreshes the tab before having selected a login role,
            // lets just throw him out.
            Session.logout();
        }
        _.merge($http.defaults, { headers: { common: { 'x-exam-authentication': user.token } } });
        Session.setUser(user);
        Session.translate(user.lang);
        Session.restartSessionCheck();
    } else {
        Session.switchLanguage('en');
        Session.login('', '').catch(angular.noop);
    }

}
