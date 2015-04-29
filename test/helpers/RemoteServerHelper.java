package helpers;

import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;

import javax.servlet.Servlet;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

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
