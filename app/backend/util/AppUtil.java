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

package backend.util;

import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.User;
import java.util.Collection;
import play.Logger;

public final class AppUtil {
    private static final Logger.ALogger logger = Logger.of(AppUtil.class);

    private AppUtil() {}

    public static void notifyPrivateExamEnded(Collection<User> recipients, Exam exam, EmailComposer composer) {
        for (User r : recipients) {
            composer.composePrivateExamEnded(r, exam);
            logger.info("Email sent to {}", r.getEmail());
        }
    }
}
