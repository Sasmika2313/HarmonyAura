import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated
} from "react-native";
import { useRouter } from "expo-router";

import type { Worker } from "../types";

type Props = {
  data: Worker;
};

export default function HumanCard({ data }: Props) {
  const router = useRouter();

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const isDanger = data.status === "issue";

  useEffect(() => {
    if (isDanger) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [isDanger, blinkAnim]);

  const borderColor =
    data.status === "safe"
      ? "#16A34A"
      : data.status === "warning"
      ? "#EAB308"
      : "#EF4444";

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/humanDetail",
          params: {
            id: data.id
          }
        } as any)
      }
    >
      <Animated.View
        style={[
          styles.card,
          {
            borderColor,
            opacity: isDanger ? blinkAnim : 1
          }
        ]}
      >
        <View style={styles.rowTop}>
          <Text style={styles.name}>Worker {data.id}</Text>
          <Text style={[styles.status, { color: borderColor }]}>
            {data.status === "safe"
              ? "Safe"
              : data.status === "warning"
              ? "Warning"
              : "Critical"}
          </Text>
        </View>

        <Text style={styles.meta}>
          🛠 Working on: Machine auto-mapped
        </Text>

        <View style={styles.rowMid}>
          <Text style={styles.metric}>
            ❤️ HR {data.vitals?.heart_rate?.toFixed(0)} bpm
          </Text>
          <Text style={styles.metric}>
            🌩 Fatigue {data.vitals?.fatigue?.toFixed(0)}
          </Text>
        </View>
        <View style={styles.rowMid}>
          <Text style={styles.metric}>
            💧 Hydration {data.vitals?.hydration?.toFixed(0)}
          </Text>
          <Text style={styles.metric}>
            🌡 Temp {data.vitals?.body_temperature?.toFixed(1)}°C
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#020617",
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 18,
    borderRadius: 18,
    borderWidth: 2
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB"
  },
  status: {
    fontSize: 13,
    fontWeight: "600"
  },
  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6
  },
  rowMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2
  },
  metric: {
    fontSize: 12,
    color: "#D1D5DB"
  }
});

