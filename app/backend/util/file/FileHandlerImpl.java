package backend.util.file;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;
import play.Logger;

public class FileHandlerImpl implements FileHandler {
  private static final int KB = 1024;
  private static final Logger.ALogger logger = Logger.of(FileHandlerImpl.class);

  @Override
  public byte[] read(File file) {
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    try (InputStream fis = new FileInputStream(file)) {
      byte[] buf = new byte[KB];
      for (int readNum; (readNum = fis.read(buf)) != -1;) {
        bos.write(buf, 0, readNum);
      }
    } catch (IOException e) {
      logger.error("Failed to read file {} from disk!", file.getAbsolutePath());
      throw new RuntimeException(e);
    }
    return bos.toByteArray();
  }

  @Override
  public String read(String path) {
    byte[] encoded;
    try {
      encoded = Files.readAllBytes(Paths.get(path));
    } catch (IOException e) {
      logger.error("Failed to read file {} from disk!", path);
      throw new RuntimeException(e);
    }
    return new String(encoded, Charset.defaultCharset());
  }

  @Override
  public String getContentDisposition(File file) {
    return "attachment; filename=\"" + file.getName() + "\"";
  }

  @Override
  public String encodeAndDelete(File file) {
    String content = Base64.getEncoder().encodeToString(read(file));
    if (!file.delete()) {
      logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
    }
    return content;
  }
}
