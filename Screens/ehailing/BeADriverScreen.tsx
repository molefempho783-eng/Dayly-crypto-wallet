// Screens/EHailing/BeADriverScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../../firebaseConfig";
import { submitDriverApplication } from "../../services/drivers";
import { useTheme } from "../context/ThemeContext";
import createStyles from "../context/appStyles";

const BeADriverScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors).beADriverScreen;
  const global = createStyles(colors).global;

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carPlate, setCarPlate] = useState("");

  const [idImage, setIdImage] = useState<string | null>(null);
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [carImage, setCarImage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  async function pick(setter: (uri: string) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.length) {
      setter(res.assets[0].uri);
    }
  }

  async function onSubmit() {
    try {
      if (!auth.currentUser) {
        Alert.alert("Login required", "Please sign in first.");
        return;
      }
      if (!fullName || !idNumber || !licenseNumber || !carMake || !carModel || !carYear || !carPlate) {
        Alert.alert("Missing info", "Please complete all fields.");
        return;
      }
      if (!idImage || !licenseImage) {
        Alert.alert("Docs required", "Please upload your ID and Driver’s License.");
        return;
      }
      setSubmitting(true);
      await submitDriverApplication({
        uid: auth.currentUser.uid,
        fullName,
        idNumber,
        licenseNumber,
        car: { make: carMake, model: carModel, year: carYear, plate: carPlate },
        idImageUri: idImage,
        licenseImageUri: licenseImage,
        carImageUri: carImage || undefined,
      });
      Alert.alert("Submitted", "Your application is submitted and pending approval.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Become a Driver</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g., John Dlamini" />

      <Text style={styles.label}>ID Number</Text>
      <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} placeholder="e.g., 0000000000000" />

      <Text style={styles.label}>Driver’s License Number</Text>
      <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g., DL12345678" />

      <Text style={styles.label}>Car Make</Text>
      <TextInput style={styles.input} value={carMake} onChangeText={setCarMake} placeholder="e.g., Toyota" />

      <Text style={styles.label}>Car Model</Text>
      <TextInput style={styles.input} value={carModel} onChangeText={setCarModel} placeholder="e.g., Corolla" />

      <Text style={styles.label}>Year</Text>
      <TextInput style={styles.input} value={carYear} onChangeText={setCarYear} placeholder="e.g., 2018" keyboardType="numeric" />

      <Text style={styles.label}>License Plate</Text>
      <TextInput style={styles.input} value={carPlate} onChangeText={setCarPlate} placeholder="e.g., HJ 12 GP" />

      <View style={styles.uploadRow}>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pick((u) => setIdImage(u))}>
          <Text style={styles.uploadText}>
            {idImage ? "✓ ID Uploaded" : "Upload ID"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pick((u) => setLicenseImage(u))}>
          <Text style={styles.uploadText}>
            {licenseImage ? "✓ License Uploaded" : "Upload License"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.uploadBox, { minHeight: 64, paddingVertical: 18, justifyContent: "center", marginTop: 20 }]}
        onPress={() => pick((u) => setCarImage(u))}
      >
        <Text style={styles.uploadText}>
          {carImage ? "✓ Car Photo Uploaded" : "Upload Car Photo (optional)"}
        </Text>
      </TouchableOpacity>

      {/* Removed image previews as requested */}

      <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} disabled={submitting} onPress={onSubmit}>
        <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit Application"}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        We’ll review your documents. You’ll see a Driver tab on the E-Hailing screen once approved.
      </Text>
    </View>
  );
};

export default BeADriverScreen;
