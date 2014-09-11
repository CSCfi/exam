package util.java;

import java.io.*;

/**
 * Created by Mikko Katajamaki on 10/09/14.
 */
public class AttachmentUtils {

    public static ByteArrayOutputStream setData(File file) {

        ByteArrayOutputStream bos = new ByteArrayOutputStream();

        try {
            InputStream fis = new FileInputStream(file);

            byte[] buf = new byte[1024];

                for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                    bos.write(buf, 0, readNum);
                }

            fis.close();
        } catch (IOException ex) {
            ex.printStackTrace();
        }

        return bos;
    }

}
