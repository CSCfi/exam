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

package helpers;

import backend.models.Exam;
import backend.util.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import net.jodah.concurrentunit.Waiter;
import play.libs.Json;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.stream.Collectors;

public class ExamServlet extends BaseServlet {

    private static String calledMethod;
    private Exam exam;
    private Waiter waiter;

    public ExamServlet() {
        this.waiter = new Waiter();
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        calledMethod = req.getMethod();
        super.service(req, resp);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        if (exam == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        final ObjectNode json = (ObjectNode) Json.toJson(exam);
        json.put("_rev", 1);
        RemoteServerHelper.writeJsonResponse(response, json, HttpServletResponse.SC_OK);
        waiter.resume();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        final String json = req.getReader().lines().collect(Collectors.joining());
        exam = JsonDeserializer.deserialize(Exam.class, Json.parse(json));
        resp.setStatus(200);
        waiter.resume();
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) {
        exam = null;
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    public String getLastCallMethod() {
        String call = calledMethod;
        calledMethod = null;
        return call;
    }

    public void setWaiter(Waiter waiter) {
        this.waiter = waiter;
    }

    public Waiter getWaiter() {
        return waiter;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }
}