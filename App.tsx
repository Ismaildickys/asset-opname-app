import React, { useState, useRef, useEffect } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

export default function App() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [mode, setMode] = useState<"scan" | "camera">("scan");

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

  // 📸 Take picture + save
  const takePicture = async () => {
    try {
      if (!cameraRef.current || !barcode) return;

      const photo = await cameraRef.current.takePictureAsync();

      console.log("Original URI:", photo.uri);

      // 📅 Tambahkan tanggal ke nama file
      const date = new Date().toISOString().split("T")[0];

      const newPath =
        FileSystem.documentDirectory +
        `${barcode}_${date}.jpg`;

      // 📁 Copy & rename file
      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath,
      });

      console.log("Saved as:", newPath);

      // 📸 Simpan ke gallery
      await MediaLibrary.createAssetAsync(newPath);

      alert(`Foto tersimpan: ${barcode}_${date}.jpg`);

      // reset
      setBarcode(null);
      setMode("scan");
    } catch (error) {
      console.error("ERROR:", error);
      alert("Gagal menyimpan foto");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {mode === "scan" ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          zoom={0.2}
          onBarcodeScanned={
            barcode ? undefined : handleBarCodeScanned
          }
        >
          <Text style={styles.text}>Scan Barcode</Text>
        </CameraView>
      ) : (
        <CameraView
          style={{ flex: 1 }}
          ref={cameraRef}
          facing="back"
          zoom={0.2}
        >
          <View style={styles.cameraContainer}>
            <Text style={styles.text}>
              Barcode: {barcode}
            </Text>
            <Button title="Ambil Foto" onPress={takePicture} />
          </View>
        </CameraView>
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
});