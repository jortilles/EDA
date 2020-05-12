/**
 * 
 */
package replace;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Scanner;

/**
 * @author Juanjo
 *
 */
public class TranslateEda {

	private static ArrayList<File> filesToTranslate = new ArrayList<File>();
	private static File[] translations;
	private static BufferedReader br;
	private static File api_translation ;
	private static File app_translation ;

	/**
	 * Comprueba que la ruta pasada exista...
	 * 
	 */
	private static void checkPath(String ruta) {
		File f = new File(ruta);
		if (f.exists() && f.isDirectory()) {
			System.out.println("La ruta existe");
		} else {
			System.out.println("El directorio " + ruta + " No existe.");
			System.exit(1);
		}

	}

	/**
	 * Recupera todos los archivos de un directorio y los mete en el array
	 * filesToTranslate para ser traducidos Los archivos estan limitados alos
	 * html...
	 */
	private static void findFiles(String ruta) {
		File root = new File(ruta);
		File[] list = root.listFiles();
		if (list == null)
			return;
		for (File f : list) {
			if (f.isDirectory()) {
				findFiles(f.getAbsolutePath());
				// System.out.println( "Dir:" + f.getAbsoluteFile() );
			} else {
				// System.out.println("File:" + f.getAbsoluteFile());
				if (f.getName().endsWith("html") ||  f.getName().endsWith("ts") ) {
					filesToTranslate.add(f);
				}
			}
		}

	}

	/*
	 * Busca archivos de traducción.
	 */
	private static void findTranslations() {
		File f = new File(".");
		System.out.println(
				"Buscando archivos de traducción... Deben llamarse eda_transaltion_XX.txt por ejemploeda_transaltion_en.txt  ");
		System.out.println("Deben tener todas las cadenas a traducir. texto original = texto traducido");
		// System.out.println( f.getAbsolutePath() );
		translations = f.listFiles(new FilenameFilter() {
			public boolean accept(File dir, String name) {
				return name.startsWith("eda_translation");
			}
		});
		System.out.println("\n\n");
		for (int i = 0; i < translations.length; i++) {
			System.out.println("Encontrado.... ( " + i  + " ) " + translations[i].getName().toString());
		}
		
				System.out.println("Que traducción (numero) quieres hacer: ");
				BufferedReader reader = new BufferedReader(new InputStreamReader(System.in)); 
				String opcion = null;
				try {
					opcion = reader.readLine();
				} catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}

				app_translation = translations[ Integer.parseInt(opcion)];
		
	}
	/*
	 * Busca archivos de traducción para la api.
	 */
	private static void findTranslationsApi() {
		File f = new File(".");
		System.out.println(
				"Buscando archivos de traducción... Deben llamarse api_translation_en_XX.txt por ejemplo api_translation_en.txt  ");
		System.out.println("Deben tener todas las cadenas a traducir. texto original = texto traducido");
		// System.out.println( f.getAbsolutePath() );
		translations = f.listFiles(new FilenameFilter() {
			public boolean accept(File dir, String name) {
				return name.startsWith("api_translation");
			}
		});
		System.out.println("\n\n");
		for (int i = 0; i < translations.length; i++) {
			System.out.println("Encontrado.... ( " + i  + " ) " +  translations[i].getName().toString());
		}
		System.out.println("\n");
		System.out.println("Que traducción (numero) quieres hacer: ");
		BufferedReader reader = new BufferedReader(new InputStreamReader(System.in)); 
		String opcion = null;
		try {
			opcion = reader.readLine();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		api_translation = translations[ Integer.parseInt(opcion)];
	}
	

	/*
	 * Traduce una cadena en todos los archivos....
	 */
	private static void translateString(String origen, String destino) {

		BufferedReader reader = null;
		BufferedWriter writer = null;

		for (int i = 0; i < filesToTranslate.size(); i++) {
			System.out.println(
					"Traduciendo " + origen + " a " + destino + " en " + filesToTranslate.get(i).getAbsolutePath());

			String originalFileContent = "";
			try {
				reader = new BufferedReader(new FileReader(filesToTranslate.get(i).getAbsolutePath()));
				String currentReadingLine = reader.readLine();
				while (currentReadingLine != null) {
					originalFileContent += currentReadingLine + System.lineSeparator();
					currentReadingLine = reader.readLine();
				}
				String modifiedFileContent = originalFileContent.replaceAll(origen, destino);
				writer = new BufferedWriter(new FileWriter(filesToTranslate.get(i).getAbsolutePath()));
				writer.write(modifiedFileContent);

			} catch (IOException e) {
				System.out.println("Error traduciendo   " + origen + " a " + destino + " en "
						+ filesToTranslate.get(i).getAbsolutePath());
				System.out.println(e);
			} finally {
				// 10
				try {
					if (reader != null) {
						reader.close();
					}
					if (writer != null) {
						writer.close();
					}
				} catch (IOException e) {
					// handle exception
					System.out.println(e);
				}
			}

		}

	}
	
	/*
	 * Traduce una cadena en  la api.....
	 */
	private static void translateStringInAPI(String origen, String destino) {

		BufferedReader reader = null;
		BufferedWriter writer = null;

		for (int i = 0; i < filesToTranslate.size(); i++) {
			System.out.println(
					"Traduciendo " + origen + " a " + destino + " en " + filesToTranslate.get(i).getAbsolutePath());

			String originalFileContent = "";
			try {
				reader = new BufferedReader(new FileReader(filesToTranslate.get(i).getAbsolutePath()));
				String currentReadingLine = reader.readLine();
				while (currentReadingLine != null) {
					originalFileContent += currentReadingLine + System.lineSeparator();
					currentReadingLine = reader.readLine();
				}
				String modifiedFileContent = originalFileContent.replaceAll(origen, destino);
				writer = new BufferedWriter(new FileWriter(filesToTranslate.get(i).getAbsolutePath()));
				writer.write(modifiedFileContent);

			} catch (IOException e) {
				System.out.println("Error traduciendo   " + origen + " a " + destino + " en "
						+ filesToTranslate.get(i).getAbsolutePath());
				System.out.println(e);
			} finally {
				// 10
				try {
					if (reader != null) {
						reader.close();
					}
					if (writer != null) {
						writer.close();
					}
				} catch (IOException e) {
					// handle exception
					System.out.println(e);
				}
			}

		}

	}
	

	/**
	 * Traduce a un idioma. Coge el archivo de traducción y traduce cada palabra en
	 * todos los archivos.
	 */
	private static void translateApi(File file) {
		String line = "";
		String splitBy = "=";
		try {
			br = new BufferedReader(new FileReader(file));
			while ((line = br.readLine()) != null) // returns a Boolean value
			{
				String[] content = line.split(splitBy); // use comma as separator
				if( content[1] == null) {
					System.out.println("NO PUEDE HABER LINEAS EN BLANDO ");
					System.exit(1);
				}
				System.out.println("Traduciendo " + content[0] + " a " + content[1]);
				translateStringInAPI(content[0], content[1]);

			}
		} catch (IOException e) {
			e.printStackTrace();
			System.out.print("NO SE HA PODIDO ENCONTRA LA TRADUCCIÓN " + file.getName());
		}

	}

	/**
	 * Traduce a un idioma. Coge el archivo de traducción y traduce cada palabra en
	 * todos los archivos.
	 */
	private static void translate(File file) {
		String line = "";
		String splitBy = "=";
		try {
			br = new BufferedReader(new FileReader(file));
			while ((line = br.readLine()) != null) // returns a Boolean value
			{
				String[] content = line.split(splitBy); // use comma as separator
				if( content[1] == null) {
					System.out.println("NO PUEDE HABER LINEAS EN BLANDO ");
					System.exit(1);
				}
				System.out.println("Traduciendo " + content[0] + " a " + content[1]);
				translateString(content[0], content[1]);

			}
		} catch (IOException e) {
			e.printStackTrace();
			System.out.print("NO SE HA PODIDO ENCONTRA LA TRADUCCIÓN " + file.getName());
		}

	}

	
	
	/**
	 * @param args
	 */
	public static void main(String[] args) {
		
		
		 BufferedReader reader = new BufferedReader(new InputStreamReader(System.in)); 
		System.out.println("Pon la ubicación de la app: ");
		String ruta = null;
		try {
			ruta = reader.readLine();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} 
		ruta = ruta + "/src/";
		//ruta = "D:/Proyectos/EDA/eda_app/src";
		//System.out.println("RUTA FORZADA LOCAL!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		System.out.println("Ruta del src de la app: " + ruta);
		
		checkPath(ruta);
		findFiles(ruta);
		findTranslations();
		
		translate(app_translation);
		
		
		System.out.println("Hecho!");
		System.out.println("....");
		System.out.println("Hay que actualizar también la api.....");
		System.out.println("hay que actualizar las agregaciones en lib/module/global/model/aggregation-types.ts");
		System.out.println("Pon la ubicación de la api:");
		try {
			ruta = reader.readLine();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} 
		checkPath(ruta);
		ruta = ruta + "/lib/module/global/model/aggregation-types.ts";
		//checkPath(ruta);
		// No find files... solo la que queremos...
		filesToTranslate.clear();
		filesToTranslate.add( new File( ruta  ));
		findTranslationsApi();
		translate(api_translation);
		
	}

}
