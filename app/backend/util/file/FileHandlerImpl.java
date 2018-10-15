package backend.util.file;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;

import play.Logger;
import play.mvc.Http;

public class FileHandlerImpl implements FileHandler {

    private static final int KB = 1024;

    @Override
    public byte[] read(File file) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (InputStream fis = new FileInputStream(file)) {
            byte[] buf = new byte[KB];
            for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                bos.write(buf, 0, readNum);
            }
        } catch (IOException ex) {
            ex.printStackTrace();
        }
        return bos.toByteArray();
    }

    @Override
    public void setContentType(File file, Http.Response response) {
        response.setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
    }

    @Override
    public String encode(File file) {
        String content = Base64.getEncoder().encodeToString(read(file));
        if (!file.delete()) {
            Logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return content;
    }
}

