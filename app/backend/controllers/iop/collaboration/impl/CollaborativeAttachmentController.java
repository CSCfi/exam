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

package backend.controllers.iop.collaboration.impl;

import java.util.Optional;
import java.util.concurrent.ExecutionException;
import javax.inject.Inject;

import io.ebean.Ebean;
import io.ebean.ExpressionList;
import play.libs.ws.WSClient;
import play.mvc.Http;

import backend.controllers.iop.collaboration.api.CollaborativeAttachmentInterface;
import backend.models.Exam;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.util.config.ConfigReader;

public class CollaborativeAttachmentController extends CollaborationController
        implements CollaborativeAttachmentInterface<Long, CollaborativeExam> {

    @Inject
    private WSClient wsClient;
    @Inject
    private ConfigReader configReader;

    @Override
    public Optional<CollaborativeExam> getExternalExam(Long eid, Http.Request request) {
        final ExpressionList<CollaborativeExam> query = Ebean.find(CollaborativeExam.class).where()
                .eq("id", eid);
        return query.findOneOrEmpty();
    }

    @Override
    public WSClient getWsClient() {
        return wsClient;
    }

    @Override
    public Optional<Exam> getExam(CollaborativeExam collaborativeExam) {
        try {
            return downloadExam(collaborativeExam).toCompletableFuture().get();
        } catch (InterruptedException | ExecutionException e) {
            logger().error("Could not download collaborative exam from XM!", e);
        }
        return Optional.empty();
    }

    @Override
    public boolean setExam(CollaborativeExam collaborativeExam, Exam exam, User user) {
        try {
            return uploadExam(collaborativeExam, exam, false, null, user)
                    .thenApply(result -> result.status() == 200)
                    .toCompletableFuture().get();
        } catch (InterruptedException | ExecutionException e) {
            logger().error("Could not update exam to XM!", e);
        }
        return false;
    }

    @Override
    public Long parseId(String id) {
        return Long.parseLong(id);
    }

    @Override
    public ConfigReader getConfigReader() {
        return configReader;
    }

}
