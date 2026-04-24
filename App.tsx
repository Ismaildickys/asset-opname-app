import React, { useState, useRef, useEffect } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { TouchableOpacity } from "react-native";

export default function App() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [mode, setMode] = useState<"scan" | "camera">("scan");
  const [photoCount, setPhotoCount] = useState(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const BASE_DIR = FileSystem.documentDirectory + "Aset/";
  const cameraRef = useRef<any>(null);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    message: string;
  }>({
    visible: false,
    message: "",
  });

  useEffect(() => {
    requestPermission();
    MediaLibrary.requestPermissionsAsync();
  }, []);

  if (!permission) return <Text>Loading...</Text>;
  if (!permission.granted) return <Text>No camera access</Text>;

  // Handle scan barcode
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    console.log("Barcode:", data);
    setBarcode(data);
    setMode("camera");
  };

  // Helper for creating folder
  const ensureDirExists = async (dir: string) => {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  };

  const sanitizeFileName = (input: string) => {
    return input
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50);
  };

  const extractName = (input: string) => {
    try {
      const parts = input.split("/");
      return parts[parts.length] || input;
    } catch {
      return input;
    }
  };

  // 📸 Take picture + save
  const takePicture = async () => {
    try {
      if (!cameraRef.current || !barcode) return;

      const photo = await cameraRef.current.takePictureAsync();

      // 📁 Main folder
      await ensureDirExists(BASE_DIR);

      // 🔐 sanitize barcode
      const rawName = extractName(barcode);
      const safeBarcode = sanitizeFileName(rawName);

      // 📁 Folder per barcode (AMAN)
      const assetDir = BASE_DIR + `${safeBarcode}/`;
      await ensureDirExists(assetDir);

      // 📸 Final Path (AMAN)
      const newPath =
        assetDir + `${safeBarcode}_${photoCount}.jpg`;

      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath,
      });

      // Save to gallery
      await MediaLibrary.createAssetAsync(newPath);

      setPhotoCount((prev) => prev + 1);

      setDialog({
        visible: true,
        message: `Tersimpan di folder: ${barcode}`,
      });
    } catch (error) {
      console.error("ERROR:", error);
      setDialog({
        visible: true,
        message: "Gagal menyimpan foto",
      });
    }
  };

  const handleFinish = () => {
    setBarcode(null);
    setPhotoCount(1);
    setMode("scan");
  };

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No camera access</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!isCameraOpen ? (
        // 🏠 HOME SCREEN
        <View style={styles.container}>
          <View style={styles.panel}>
            <Text style={styles.title}>Asset Tool</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setIsCameraOpen(true);
                setMode("scan");
              }}
            >
              <Text style={styles.buttonText}>Open Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : mode === "scan" ? (
        // 🔍 SCAN MODE
        <View style={styles.cameraContainer}>
          <View style={styles.cameraFrameOuter}>
            <View style={styles.cameraFrameInner}>
              <CameraView
                style={styles.cameraPreview}
                ref={cameraRef}
                facing="back"
                zoom={0.2}
                onBarcodeScanned={
                  barcode ? undefined : handleBarCodeScanned
                }
              />
            </View>
          </View>

          {/* Overlay */}
          <View style={styles.cameraPanel}>
            <Text style={styles.cameraText}>[ SCAN MODE ]</Text>
            <Text style={styles.cameraText}>Ready to scan...</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.retroButton}
                onPress={() => {
                  setIsCameraOpen(false);
                  setBarcode(null);
                }}
              >
                <Text style={styles.retroButtonText}>BACK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // 📸 CAMERA MODE
        <View style={styles.cameraContainer}>
          <View style={styles.cameraFrameOuter}>
            <View style={styles.cameraFrameInner}>
              <CameraView
                style={styles.cameraPreview}
                ref={cameraRef}
                facing="back"
                zoom={0.2}
              />
            </View>
          </View>

          {/* Overlay */}
          <View style={styles.cameraPanel}>
            <Text style={styles.cameraText}>[ CAMERA MODE ]</Text>
            <Text style={styles.cameraText}>
              BARCODE: {barcode}
            </Text>
            <Text style={styles.cameraText}>
              FOTO: {photoCount}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.retroButton}
                onPress={takePicture}
              >
                <Text style={styles.retroButtonText}>CAPTURE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retroButton}
                onPress={handleFinish}
              >
                <Text style={styles.retroButtonText}>DONE</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.retroButton}
                onPress={() => {
                  setIsCameraOpen(false);
                  setBarcode(null);
                  setPhotoCount(1);
                }}
              >
                <Text style={styles.retroButtonText}>EXIT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {dialog.visible && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              SYSTEM MESSAGE
            </Text>

            <Text style={styles.dialogText}>
              {dialog.message}
            </Text>

            <TouchableOpacity
              style={styles.dialogButton}
              onPress={() =>
                setDialog({ visible: false, message: "" })
              }
            >
              <Text style={styles.dialogButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// 🎨 Styles (HARUS di luar component)
const styles = StyleSheet.create({
  // 🪟 background jadul
  container: {
    flex: 1,
    backgroundColor: "#C0C0C0",
    justifyContent: "center",
    alignItems: "center",
  },

  // 🧱 panel box
  panel: {
    backgroundColor: "#C0C0C0",
    padding: 20,
    borderWidth: 2,
    borderColor: "#808080",
    width: 250,
  },

  // 🧊 title
  title: {
    fontFamily: "monospace",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },

  // 🔘 button jadul
  button: {
    backgroundColor: "#C0C0C0",
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: "center",

    // efek 3D klasik
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFFFFF",
    borderLeftColor: "#FFFFFF",
    borderRightColor: "#000000",
    borderBottomColor: "#000000",
  },

  buttonText: {
    fontSize: 14,
    color: "black",
  },

  text: {
    fontFamily: "monospace",
    color: "white",
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
  },

  overlay: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  cameraText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: "monospace",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },

  retroButton: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#C0C0C0",

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFFFFF",
    borderLeftColor: "#FFFFFF",
    borderRightColor: "#000000",
    borderBottomColor: "#000000",
  },

  retroButtonText: {
    fontSize: 12,
    fontFamily: "monospace",
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: "#C0C0C0",
    justifyContent: "center",
    alignItems: "center",
  },

  // 🪟 FRAME LUAR (gelap)
  cameraFrameOuter: {
    padding: 4,
    backgroundColor: "#808080",

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#000",
    borderLeftColor: "#000",
    borderRightColor: "#FFF",
    borderBottomColor: "#FFF",
  },

  // 🪟 FRAME DALAM (terang)
  cameraFrameInner: {
    padding: 4,
    backgroundColor: "#C0C0C0",

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFF",
    borderLeftColor: "#FFF",
    borderRightColor: "#000",
    borderBottomColor: "#000",
  },

  // 📷 kotak camera (TIDAK FULLSCREEN)
  cameraPreview: {
    width: 330,
    height: 450,
    backgroundColor: "black",

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#000",
    borderLeftColor: "#000",
    borderRightColor: "#FFF",
    borderBottomColor: "#FFF",
  },

  // 📦 panel bawah
  cameraPanel: {
    marginTop: 15,
    width: 280,
    backgroundColor: "#C0C0C0",
    padding: 10,

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFF",
    borderLeftColor: "#FFF",
    borderRightColor: "#000",
    borderBottomColor: "#000",
  },

  dialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  dialogBox: {
    width: 260,
    backgroundColor: "#C0C0C0",
    padding: 10,

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFF",
    borderLeftColor: "#FFF",
    borderRightColor: "#000",
    borderBottomColor: "#000",
  },

  dialogTitle: {
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "monospace",
  },

  dialogText: {
    marginBottom: 15,
    fontFamily: "monospace",
  },

  dialogButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: "#C0C0C0",

    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,

    borderTopColor: "#FFF",
    borderLeftColor: "#FFF",
    borderRightColor: "#000",
    borderBottomColor: "#000",
  },

  dialogButtonText: {
    fontFamily: "monospace",
  },
});