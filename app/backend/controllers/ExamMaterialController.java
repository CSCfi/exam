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

package backend.controllers;

import java.util.Optional;
import java.util.Set;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import org.springframework.beans.BeanUtils;
import play.mvc.Result;

import backend.controllers.base.SectionQuestionHandler;
import backend.models.User;
import backend.models.sections.ExamMaterial;
import backend.models.sections.ExamSection;
import backend.util.AppUtil;


public class ExamMaterialController extends QuestionController implements SectionQuestionHandler {

    private ExamMaterial parseFromBody(JsonNode body) {
        ExamMaterial em = new ExamMaterial();
        em.setName(body.get("name").asText());
        em.setAuthor(body.path("author").asText(null));
        em.setIsbn(body.path("isbn").asText(null));
        return em;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createMaterial() {
        ExamMaterial em = parseFromBody(request().body().asJson());
        User user = getLoggedUser();
        AppUtil.setCreator(em, user);
        AppUtil.setModifier(em, user);
        em.save();
        return ok(em);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listMaterials() {
        Set<ExamMaterial> materials = Ebean.find(ExamMaterial.class)
                .where()
                .eq("creator", getLoggedUser())
                .findSet();
        return ok(materials, PathProperties.parse("(*)"));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeMaterial(Long materialId) {
        ExamMaterial em = Ebean.find(ExamMaterial.class, materialId);
        if (em == null || !em.getCreator().equals(getLoggedUser())) {
            return notFound();
        }
        Ebean.delete(ExamMaterial.class, materialId);
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateMaterial(Long materialId) {
        ExamMaterial dst = Ebean.find(ExamMaterial.class, materialId);
        if (dst == null || !dst.getCreator().equals(getLoggedUser())) {
            return notFound();
        }
        ExamMaterial src = parseFromBody(request().body().asJson());
        BeanUtils.copyProperties(src, dst, "id", "examSections", "objectVersion");
        dst.update();
        return ok();
    }

    private Optional<ExamSection> getSection(Long sectionId) {
        return Ebean.find(ExamSection.class)
                .where()
                .idEq(sectionId)
                .eq("exam.examOwners", getLoggedUser())
                .findOneOrEmpty();

    }

    private Optional<Result> getOwnershipError(ExamMaterial em) {
        return em == null || !em.getCreator().equals(getLoggedUser()) ? Optional.of(notFound()) : Optional.empty();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addMaterialForSection(Long sectionId, Long materialId) {
        ExamMaterial em = Ebean.find(ExamMaterial.class, materialId);
        return getOwnershipError(em).orElseGet(() -> {
            Optional<ExamSection> oes = getSection(sectionId);
            if (oes.isPresent()) {
                ExamSection es = oes.get();
                es.getExamMaterials().add(em);
                es.update();
                return ok();
            }
            return notFound();
        });
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeMaterialFromSection(Long sectionId, Long materialId) {
        ExamMaterial em = Ebean.find(ExamMaterial.class, materialId);
        return getOwnershipError(em).orElseGet(() -> {
            Optional<ExamSection> oes = getSection(sectionId);
            if (oes.isPresent()) {
                ExamSection es = oes.get();
                es.getExamMaterials().remove(em);
                if (es.getExamMaterials().isEmpty()) {
                    es.setOptional(false);
                }
                es.update();
                return ok();
            }
            return notFound();
        });
    }

}
