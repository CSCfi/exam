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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Objects;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import net.jodah.concurrentunit.Waiter;
import org.apache.commons.io.IOUtils;

public class AttachmentServlet extends BaseServlet {
    private File testFile;

    public AttachmentServlet() {
        final ClassLoader classLoader = AttachmentServlet.class.getClassLoader();
        this.testFile =
            new File(Objects.requireNonNull(classLoader.getResource("test_files/test_image.png")).getFile());
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
