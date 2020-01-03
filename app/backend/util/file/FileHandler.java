package backend.util.file;

import java.io.File;

public interface FileHandler {
    byte[] read(File file);
    String read(String path);
    String encode(File file);
    String getContentDisposition(File file);
}
