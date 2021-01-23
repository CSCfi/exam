package helpers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.Writer;
import java.util.List;
import java.util.Map;
import javax.servlet.Servlet;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
import play.libs.Json;

public class RemoteServerHelper {

    public static void writeResponseFromFile(HttpServletResponse response, String filePath) {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_OK);
        try (
            FileInputStream fis = new FileInputStream(new File(filePath));
            ServletOutputStream sos = response.getOutputStream()
        ) {
            IOUtils.copy(fis, sos);
            sos.flush();
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    public static void writeJsonResponse(HttpServletResponse response, JsonNode node, int status) {
        response.setContentType("application/json");
        response.setStatus(status);
        try {
            response.getWriter().write(node.toString());
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    public static void writeEmptyJsonResponse(HttpServletResponse response) {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_OK);
        try (Writer writer = response.getWriter()) {
            ObjectNode data = Json.newObject();
            data.set("data", new ObjectMapper().createArrayNode());
            writer.write(data.toString());
        } catch (IOException e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    public static Server createAndStartServer(int port, Map<Class<? extends Servlet>, List<String>> handlers)
        throws Exception {
        Server server = new Server(port);
        server.setStopAtShutdown(true);
        ServletHandler sh = new ServletHandler();
        handlers.forEach((k, v) -> v.forEach(s -> sh.addServletWithMapping(k, s)));
        server.setHandler(sh);
        server.start();
        return server;
    }

    public static void shutdownServer(Server server) throws Exception {
        server.stop();
    }
}
