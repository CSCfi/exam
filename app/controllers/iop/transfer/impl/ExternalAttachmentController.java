// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import controllers.base.BaseController;
import controllers.iop.transfer.api.ExternalAttachmentInterface;
import io.ebean.DB;
import io.ebean.ExpressionList;
import java.io.IOException;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import models.exam.Exam;
import models.iop.ExternalExam;
import models.user.Role;
import models.user.User;
import play.libs.ws.WSClient;
import play.mvc.Http;
import play.mvc.Result;

public class ExternalAttachmentController extends BaseController implements ExternalAttachmentInterface {

    @Inject
    private WSClient wsClient;

    @Inject
    private ConfigReader configReader;

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
        final ExpressionList<ExternalExam> query = DB.find(ExternalExam.class).where().eq("hash", id);
        if (user.hasRole(Role.Name.STUDENT)) {
            query.eq("creator", user);
        }
        return query.findOneOrEmpty();
    }

    @Override
    public CompletionStage<Result> updateExternalAssessment(
        ExternalExam exam,
        String assessmentRef,
        Http.Request request
    ) {
        return wrapAsPromise(notAcceptable());
    }

    @Override
    public CompletionStage<Result> deleteExternalAssessment(ExternalExam exam, String assessmentRef) {
        return wrapAsPromise(notAcceptable());
    }

    @Override
    public ConfigReader getConfigReader() {
        return configReader;
    }
}
