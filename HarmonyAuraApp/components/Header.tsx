import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Header() {

  const router = useRouter();

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Harmony Aura
      </Text>

      <Pressable onPress={() => router.push("/machines")}>

        <Text style={styles.menu}>
          ☰
        </Text>

      </Pressable>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    height: 60,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 18,

    backgroundColor: "#fff"

  },

  title: {

    fontSize: 20,
    fontWeight: "600"

  },

  menu: {

    fontSize: 24

  }

});
