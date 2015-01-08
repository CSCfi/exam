package com.converter;

/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

import javax.swing.*;
import java.io.*;
import java.util.logging.Level;
import java.util.logging.Logger;

// Lue tiedosto into -> new byte[filesize]
/**
 * Contains basic operations for storing, reading and manipulting contacts, into
 * files.
 * 
 * @author Andrei Vainik
 */
public class FileSystem {

	public static byte[] getBinaryData(File file) {
		long fileSize = file.length();
		byte[] binaryData = new byte[(int) fileSize];

		BufferedInputStream reader = null;
		int bytesRead = 0;

		try {
			reader = new BufferedInputStream(new FileInputStream(file));

			do {
				bytesRead = reader.read(binaryData);
			} while (bytesRead > -1);

		} catch (FileNotFoundException e) {
			JOptionPane.showMessageDialog(null, "Error", "File not found",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		} catch (IOException e) {
			JOptionPane.showMessageDialog(null, "Error", "File read error",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		}

		try {
			reader.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		return binaryData;
	}

	public static void writeBinaryData(File file, byte[] data) {
		// remember to check IF file already exists !!!
		if (!file.exists()) {
			try {
				file.createNewFile();
			} catch (IOException ex) {
				Logger.getLogger(FileSystem.class.getName()).log(Level.SEVERE,
						null, ex);
			}
		}

		BufferedOutputStream writer = null;
		try {
			writer = new BufferedOutputStream(new FileOutputStream(file));
			writer.write(data);

		} catch (FileNotFoundException e) {
			JOptionPane.showMessageDialog(null, "Error", "File not found",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		} catch (IOException e) {
			JOptionPane.showMessageDialog(null, "Error", "File write error",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		}

		try {
			writer.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public static byte[] getImageData() {
		File file = FileSystem.getFilePath();
		byte[] data = FileSystem.getBinaryData(file);

		// System.out.println("data:\n"+ data.length);
		return data;
	}

	/**
	 * Reads Vector object from contacts.cnt file
	 * 
	 * @return Vector which contains contacts
	 */
	public static Object readObject(String name) {

		ObjectInputStream inputStream = null;
		Object obj = null;

		try {
			inputStream = new ObjectInputStream(new BufferedInputStream(
					new FileInputStream(name)));

			while ((obj = inputStream.readObject()) != null) {
				// if (obj instanceof Vector) {
				// contacts = (Vector)obj;
				// }
			}

		} catch (EOFException ex) {
			System.out.println("End of file reached.");
			// JOptionPane.showMessageDialog(null, "EOF", "ERROR",
			// JOptionPane.ERROR_MESSAGE);
		} catch (ClassNotFoundException ex) {
			ex.printStackTrace();
			JOptionPane.showMessageDialog(null, "ClassNotFoundException",
					"ERROR", JOptionPane.ERROR_MESSAGE);
		} catch (FileNotFoundException ex) {
			JOptionPane.showMessageDialog(null, "FileNotFoundException",
					"ERROR", JOptionPane.ERROR_MESSAGE);
			ex.printStackTrace();
		} catch (IOException ex) {
			ex.printStackTrace();
			JOptionPane.showMessageDialog(null, "IOException", "ERROR",
					JOptionPane.ERROR_MESSAGE);
		} finally {
			// Close the ObjectInputStream
			try {
				if (inputStream != null) {
					inputStream.close();
				}
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
		return obj;
	}

	public static String readFile(String name) {

		String str = "";
		String html = "";
		BufferedReader reader = null;

		try {
			reader = new BufferedReader(new FileReader(new File(name)));
			while ((str = reader.readLine()) != null) {
				html += str;
			}

		} catch (FileNotFoundException e) {
			JOptionPane.showMessageDialog(null, "Error", "File not found",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		} catch (IOException e) {
			JOptionPane.showMessageDialog(null, "Error", "File read error",
					JOptionPane.OK_OPTION);
			e.printStackTrace();
		}

		try {
			reader.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		return html;
	}

	/**
	 * Writes Object object into contacts.cnt file
	 * 
	 * @param contacts
	 *            Vector which contains contacts
	 */
	public static void writeObject(Object obj, String name) {

		ObjectOutputStream outputStream = null;

		try {
			outputStream = new ObjectOutputStream(new FileOutputStream(name,
					false));
			outputStream.writeObject(obj);

		} catch (FileNotFoundException ex) {
			ex.printStackTrace();
		} catch (IOException ex) {
			ex.printStackTrace();
		} finally {
			// Close the ObjectOutputStream
			try {
				if (outputStream != null) {
					outputStream.flush();
					outputStream.close();
				}
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
	}

	/**
	 * Checks if file exists? If not, file will be created.
	 * 
	 */
	public static boolean fileExist(String name) {
		File filu = new File(name);
		if (!filu.exists()) {
			try {
				filu.createNewFile();
			} catch (IOException ex) {
				Logger.getLogger(FileSystem.class.getName()).log(Level.SEVERE,null, ex);
			}
			return false;
		}
		return true;
	}

	/**
	 * Opens JFileChooser Open dialog
	 * 
	 * @return selected File
	 */
	public static File getFilePath() {
		JFileChooser chooser = new JFileChooser();

		int returnVal = chooser.showOpenDialog(null);
		if (returnVal == JFileChooser.APPROVE_OPTION) {
			return chooser.getSelectedFile();
		} else {
			return null;
		}
	}

	/**
	 * Opens JFileChooser Save dialog
	 * 
	 * @return selected File
	 */
	public static File setFilePath(String defaultFile) {
		JFileChooser chooser = new JFileChooser();

		if (defaultFile != null)
			chooser.setSelectedFile(new File(defaultFile));

		int returnVal = chooser.showSaveDialog(null);
		if (returnVal == JFileChooser.APPROVE_OPTION) {
			return chooser.getSelectedFile();
		} else {
			return null;
		}
	}

	public static String[] listFiles(File path) {
		String[] fileList = path.list();
		return fileList;
	}

}
