import React, { useState } from "react";
import { SafeAreaView, Image, ImageBackground, View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { LinearGradient } from "expo-linear-gradient";

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, "AuthScreen">;

const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(true);
  const [error, setError] = useState("");
  const navigation = useNavigation<AuthScreenNavigationProp>();

  const handleAuth = async () => {
    try {
      if (isSignup) {
        if (!username.trim()) {
          setError("Username is required.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(collection(db, "users"), user.uid), {
          username,
          email,
          uid: user.uid,
          createdAt: new Date(),
        });

        Alert.alert("Success", "Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert("Welcome!", "You have successfully logged in.");
      }

      setError("");
      navigation.navigate("CommunityScreen"); // Ensure CommunityScreen exists in navigator
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={{ flexGrow: 1, backgroundColor: "#151316", paddingHorizontal: 20, paddingVertical: 40 }}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Image source={require("../assets/logo.png")} resizeMode="contain" style={{ width: 120, height: 120 }} />
      </View>

      <ImageBackground source={require("../assets/background.png")} resizeMode="cover" style={{ alignItems: "center", paddingVertical: 50, width: "100%" }}>
        {isSignup && (
          <View style={{ width: "90%", marginBottom: 15 }}>
            <TextInput
              style={{ height: 50, width: "100%", backgroundColor: "#EFEFEF", borderRadius: 8, paddingHorizontal: 10 }}
              placeholder="Username"
              placeholderTextColor="#A3A3A3"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        )}

        <View style={{ width: "90%", marginBottom: 15 }}>
          <TextInput
            style={{ height: 50, width: "100%", backgroundColor: "#EFEFEF", borderRadius: 8, paddingHorizontal: 10 }}
            placeholder="Email"
            placeholderTextColor="#A3A3A3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={{ width: "90%", marginBottom: 20 }}>
          <TextInput
            style={{ height: 50, width: "100%", backgroundColor: "#EFEFEF", borderRadius: 8, paddingHorizontal: 10 }}
            placeholder="Password"
            placeholderTextColor="#A3A3A3"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text> : null}

        <TouchableOpacity style={{ width: "90%", marginBottom: 20 }} onPress={handleAuth}>
          <LinearGradient colors={["#9C3FE4", "#C65647"]} style={{ borderRadius: 15, paddingVertical: 15, alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "bold" }}>{isSignup ? "Sign Up" : "Login"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
          <Text style={{ color: "#007bff", fontSize: 16, marginTop: 10 }}>
            {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
};

export default AuthScreen;