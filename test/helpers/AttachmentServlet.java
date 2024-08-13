// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers;

import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Objects;
import net.jodah.concurrentunit.Waiter;
import org.apache.commons.io.IOUtils;

public class AttachmentServlet extends BaseServlet {

    private File testFile;

    public AttachmentServlet() {
        final ClassLoader classLoader = AttachmentServlet.class.getClassLoader();
        this.testFile = new File(
            Objects.requireNonNull(classLoader.getResource("test_files/test_image.png")).getFile()
        );
        this.waiter = new Waiter();
    }

    public AttachmentServlet(File testFile) {
        this.testFile = testFile;
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        calledMethod = req.getMethod();
        super.service(req, resp);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        response.setContentType("image/png");
        response.setHeader("Content-Disposition", "attachment; filename=\"test_image.png\"");
        response.setStatus(HttpServletResponse.SC_OK);

        try (
            FileInputStream fis = new FileInputStream(testFile);
            ServletOutputStream sos = response.getOutputStream()
        ) {
            IOUtils.copy(fis, sos);
            sos.flush();
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
        waiter.resume();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
        if (req.getHeader("Content-Type").toLowerCase().startsWith("multipart/form-data")) {
            req.getPart("file");
        }
        resp.setStatus(HttpServletResponse.SC_CREATED);
        resp
            .getWriter()
            .write("{\"id\": \"abcdefg123456\", \"displayName\": \"test_image.png\", \"mimeType\": \"image/png\"}");
        resp.getWriter().flush();
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
        final Part filePart = req.getPart("file");
        filePart.write(filePart.getSubmittedFileName());
        resp.setStatus(HttpServletResponse.SC_OK);
        waiter.resume();
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) {
        resp.setStatus(HttpServletResponse.SC_OK);
    }
}
