import React, { useState, useRef } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File, Directory } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState<string | null>(null);
  const [mode, setMode] = useState<"scan" | "camera">("scan");

  const cameraRef = useRef<any>(null);

  // Request permission
React.useEffect(() => {
  requestPermission();
  MediaLibrary.requestPermissionsAsync();
}, []);

if (!permission) return <Text>Loading...</Text>;
if (!permission.granted) return <Text>No camera access</Text>;

  // Barcode scanned
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    console.log("Barcode:", data);
    setBarcode(data);
    setMode("camera");
  };

  // Take photo
const takePicture = async () => {
  try {
    if (!cameraRef.current || !barcode) return;

    const photo = await cameraRef.current.takePictureAsync({
    quality: 0.8,
    skipProcessing: false,
    });

    console.log("Original URI:", photo.uri);

    const newPath = FileSystem.documentDirectory + `${barcode}.jpg`;

    // Copy file with barcode name
    await FileSystem.copyAsync({
      from: photo.uri,
      to: newPath,
    });

    console.log("Saved as:", newPath);

    // Save to gallery
    await MediaLibrary.createAssetAsync(newPath);

    alert(`Foto tersimpan dengan nama: ${barcode}.jpg`);

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
          onBarcodeScanned={barcode ? undefined : handleBarCodeScanned}
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
            <Text style={styles.text}>Barcode: {barcode}</Text>
            <Button title="Ambil Foto" onPress={takePicture} />
          </View>
        </CameraView>
      )}
    </View>
  );
}

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