package helpers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
import play.libs.Json;

import javax.servlet.Servlet;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.Writer;

public class RemoteServerHelper {


    public static void writeResponseFromFile(HttpServletResponse response, String filePath) {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_OK);
        try (FileInputStream fis = new FileInputStream(new File(filePath)); ServletOutputStream sos = response.getOutputStream()) {
            IOUtils.copy(fis, sos);
            sos.flush();
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    public static void writeEmptyJsonResponse(HttpServletResponse response) {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_OK);
        try (Writer writer = response.getWriter()) {
            ObjectNode data = Json.newObject();
            data.put("data", new ObjectMapper().createArrayNode());
            writer.write(data.toString());
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    public static Server createAndStartServer(int port, Class<? extends Servlet> handler, String resourcePath) throws Exception {
        Server server = new Server(port);
        server.setStopAtShutdown(true);
        ServletHandler sh = new ServletHandler();
        sh.addServletWithMapping(handler, resourcePath);
        server.setHandler(sh);
        server.start();
        return server;
    }

    public static void shutdownServer(Server server) throws Exception {
        server.stop();
    }

}
