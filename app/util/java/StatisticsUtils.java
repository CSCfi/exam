package util.java;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Created by Mikko Katajamaki on 10/09/14.
 */
public class StatisticsUtils {

    private static final DateTimeFormatter dateFormat = DateTimeFormatter.ofPattern("dd.MM.yyyy"); // ! java.text format not joda

    public static void addHeader(Sheet sheet, String[] headers, int row, final int SIZE) {
        Row headerRow = sheet.createRow(row);
        for(int i = 0; i < SIZE; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);

        }
    }

    public static void setBytes(FileInputStream fis, ByteArrayOutputStream bos) {
        byte[] buf = new byte[1024];
        try {
            for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                bos.write(buf, 0, readNum);
            }
        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }

    public static void addCell(Row dataRow, int index, String content) {
        dataRow.createCell(index).setCellValue(content);
    }

    public static void addDateCell(CellStyle style, Row dataRow, int index, Timestamp time) {
        Cell cell = dataRow.createCell(index);
        cell.setCellValue(time);
        cell.setCellStyle(style);
    }

    public static void addDateBetweenCell(Row dataRow, int index, Timestamp from, Timestamp to) {
        dataRow.createCell(index).setCellValue(from.toLocalDateTime().toLocalDate().format(dateFormat).toString() + " - " + to.toLocalDateTime().toLocalDate().format(dateFormat).toString());
    }

    public static void incrementResult(Long id, Map<Long,Integer> map) {
        if(map.get(id) == null) {
            map.put(id, 1);
        } else {
            int i = map.get(id);
            map.put(id, ++i);
        }
    }

    public static int getMapResult(Long id, Map<Long, Integer> map) {
        int i = map.get(id) != null ? map.get(id) : 0;
        return i;
    }
}
