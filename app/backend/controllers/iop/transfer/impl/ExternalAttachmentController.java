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
 *
 */

package backend.controllers.iop.transfer.impl;

import java.io.IOException;
import java.util.Optional;
import javax.inject.Inject;

import io.ebean.Ebean;
import io.ebean.ExpressionList;
import play.libs.ws.WSClient;
import play.mvc.Http;

import backend.controllers.base.BaseController;
import backend.controllers.iop.transfer.api.ExternalAttachmentInterface;
import backend.models.Exam;
import backend.models.Role;
import backend.models.User;
import backend.models.json.ExternalExam;

public class ExternalAttachmentController extends BaseController implements ExternalAttachmentInterface {

    @Inject
    private WSClient wsClient;

    @Override
    public WSClient getWsClient() {
        return wsClient;
    }

    @Override
    public boolean setExam(ExternalExam externalExam, Exam exam, User user) {
        try {
            externalExam.serialize(exam);
            externalExam.save();
            return true;
        } catch (IOException e) {
            logger().error("Can not serialize exam!", e);
        }
        return false;
    }

    @Override
    public String parseId(String id) {
        return id;
    }

    @Override
    public Optional<Exam> getExam(ExternalExam externalExam) {
        try {
            return Optional.of(externalExam.deserialize());
        } catch (IOException e) {
            logger().error("Can not deserialize external exam!", e);
        }
        return Optional.empty();
    }

    @Override
    public Optional<ExternalExam> getExternalExam(String id, Http.Request request) {
        final User user = getUser(request);
        final ExpressionList<ExternalExam> query = Ebean.find(ExternalExam.class).where()
                .eq("hash", id);
        if (user.hasRole(Role.Name.STUDENT)) {
            query.eq("creator", user);
        }
        return query.findOneOrEmpty();
    }

}
