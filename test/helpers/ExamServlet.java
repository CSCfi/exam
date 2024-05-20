// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers;

import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.stream.Collectors;
import miscellaneous.json.JsonDeserializer;
import models.exam.Exam;
import net.jodah.concurrentunit.Waiter;
import play.libs.Json;

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
