// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.question;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.SectionQuestionHandler;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.util.Optional;
import java.util.Set;
import models.sections.ExamMaterial;
import models.sections.ExamSection;
import models.user.User;
import org.springframework.beans.BeanUtils;
import play.mvc.Http;
import play.mvc.Result;
import security.Authenticated;
import validation.core.Attrs;

public class ExamMaterialController extends QuestionController implements SectionQuestionHandler {

    private ExamMaterial parseFromBody(JsonNode body) {
        ExamMaterial em = new ExamMaterial();
        em.setName(body.get("name").asText());
        em.setAuthor(body.path("author").asText(null));
        em.setIsbn(body.path("isbn").asText(null));
        return em;
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result createMaterial(Http.Request request) {
        ExamMaterial em = parseFromBody(request.body().asJson());
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        em.setCreatorWithDate(user);
        em.setModifierWithDate(user);
        em.save();
        return ok(em);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result listMaterials(Http.Request request) {
        Set<ExamMaterial> materials = DB.find(ExamMaterial.class)
            .where()
            .eq("creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .findSet();
        return ok(materials, PathProperties.parse("(*)"));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeMaterial(Long materialId, Http.Request request) {
        ExamMaterial em = DB.find(ExamMaterial.class, materialId);
        if (em == null || !em.getCreator().equals(request.attrs().get(Attrs.AUTHENTICATED_USER))) {
            return notFound();
        }
        DB.delete(ExamMaterial.class, materialId);
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result updateMaterial(Long materialId, Http.Request request) {
        ExamMaterial dst = DB.find(ExamMaterial.class, materialId);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (dst == null || !dst.getCreator().equals(user)) {
            return notFound();
        }
        ExamMaterial src = parseFromBody(request.body().asJson());
        BeanUtils.copyProperties(src, dst, "id", "examSections", "objectVersion");
        dst.update();
        return ok();
    }

    private Optional<ExamSection> getSection(Long sectionId, User user) {
        return DB.find(ExamSection.class).where().idEq(sectionId).eq("exam.examOwners", user).findOneOrEmpty();
    }

    private Optional<Result> getOwnershipError(ExamMaterial em, User user) {
        return em == null || !em.getCreator().equals(user) ? Optional.of(notFound()) : Optional.empty();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result addMaterialForSection(Long sectionId, Long materialId, Http.Request request) {
        ExamMaterial em = DB.find(ExamMaterial.class, materialId);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return getOwnershipError(em, user).orElseGet(() -> {
            Optional<ExamSection> oes = getSection(sectionId, user);
            if (oes.isPresent()) {
                ExamSection es = oes.get();
                es.getExamMaterials().add(em);
                es.update();
                return ok();
            }
            return notFound();
        });
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeMaterialFromSection(Long sectionId, Long materialId, Http.Request request) {
        ExamMaterial em = DB.find(ExamMaterial.class, materialId);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return getOwnershipError(em, user).orElseGet(() -> {
            Optional<ExamSection> oes = getSection(sectionId, user);
            if (oes.isPresent()) {
                ExamSection es = oes.get();
                es.getExamMaterials().remove(em);
                es.update();
                return ok();
            }
            return notFound();
        });
    }
}
