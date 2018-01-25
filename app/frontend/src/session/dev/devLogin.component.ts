/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
import { SessionService, User } from '../session.service';

export const DevLoginComponent: angular.IComponentOptions = {
    bindings: {
        onLoggedIn: '&'
    },
    template: `
    <div class="top-row">
        <div class="col-md-12">
            <div class="student-details-title-wrap padtop noleft">
                <div class="student-exam-details-title">{{'sitnet_login' | translate}}</div>
            </div>
        </div>
    </div>
    <div id="login">
        <form ng-submit="$ctrl.login()">
            <p>
                <label class="control-label">{{'sitnet_username' | translate}}</label>
                <input class="form-control login" type="text" placeholder="{{'sitnet_username' | translate}}"
                       ng-model="$ctrl.credentials.username"/>
            </p>
                <p>
                <label class="control-label">{{'sitnet_password' | translate}}</label>
                <input class="form-control login" type="password" placeholder="{{'sitnet_password' | translate}}"
                       ng-model="$ctrl.credentials.password"/><br/>
            </p>
            <p>
                <button type="submit" class="btn btn-primary" id="submit">{{'sitnet_login' | translate}}</button>
            </p>
        </form>
    </div>
    `,
    controller: class DevLoginController {
        onLoggedIn: ({ user: User }) => void;
        credentials: {
            username: string,
            password: string
        } = { username: '', password: '' };

        /* @ngInject */
        constructor(private Session: SessionService) {
        }

        login() {
            this.Session.login(this.credentials.username, this.credentials.password)
                .then((user: User) => {
                    this.onLoggedIn({ 'user': user });
                })
                .catch((err) => {
                    console.log(JSON.stringify(err));
                });

        }

    }

};
