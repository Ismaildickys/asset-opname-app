import React, { useState, useRef, useEffect } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

export default function App() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [mode, setMode] = useState<"scan" | "camera">("scan");
  const [photoCount, setPhotoCount] = useState(1);
  const BASE_DIR = FileSystem.documentDirectory + "Aset/";

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    requestPermission();
    MediaLibrary.requestPermissionsAsync();
  }, []);

  if (!permission) return <Text>Loading...</Text>;
  if (!permission.granted) return <Text>No camera access</Text>;

  // 🔍 Handle scan barcode
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
      return parts[parts.length - 1] || input;
    } catch {
      return input;
    }
  };

  // 📸 Take picture + save
  const takePicture = async () => {
    try {
      if (!cameraRef.current || !barcode) return;

      const photo = await cameraRef.current.takePictureAsync();

      const date = new Date().toISOString().split("T")[0];

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
        assetDir + `${safeBarcode}_${date}_${photoCount}.jpg`;

      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath,
      });

      // Save to gallery
      await MediaLibrary.createAssetAsync(newPath);

      setPhotoCount((prev) => prev + 1);

      alert(`Tersimpan di folder: ${barcode}`);
    } catch (error) {
      console.error("ERROR:", error);
      alert("Gagal menyimpan foto");
    }
  };

  const handleFinish = () => {
    setBarcode(null);
    setPhotoCount(1);
    setMode("scan");
  };

  return (
    <View style={{ flex: 1 }}>
      {mode === "scan" ? (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            zoom={0.2}
            onBarcodeScanned={
              barcode ? undefined : handleBarCodeScanned
            }
          />

          {/* Overlay */}
          <View style={styles.overlay}>
            <Text style={styles.text}>Scan Barcode</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            ref={cameraRef}
            facing="back"
            zoom={0.2}
          />

          {/* Overlay */}
          <View style={styles.overlay}>
            <Text style={styles.text}>Barcode: {barcode}</Text>
            <Text style={styles.text}>Foto ke: {photoCount}</Text>

            <Button title="Ambil Foto" onPress={takePicture} />
            <Button title="Selesai" onPress={handleFinish} />
          </View>
        </View>
      )}
    </View>
  );
}

// 🎨 Styles (HARUS di luar component)
const styles = StyleSheet.create({
  text: {
    color: "white",
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "flex-end",
    marginBottom: 50,
  },
  overlay: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});