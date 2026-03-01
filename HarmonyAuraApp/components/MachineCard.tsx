import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated
} from "react-native";
import type { Machine } from "../types";

type Props = {
  data: Machine;
};

export default function MachineCard({ data }: Props) {
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const isCritical = data.status === "fault";

  useEffect(() => {
    if (isCritical) {
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
  }, [isCritical, blinkAnim]);

  const borderColor =
    data.status === "healthy"
      ? "#16A34A"
      : data.status === "warning"
      ? "#EAB308"
      : "#EF4444";

  const statusText =
    data.status === "healthy"
      ? "Safe"
      : data.status === "warning"
      ? "Warning"
      : "Critical";

  return (
    <Pressable>
      <Animated.View
        style={[
          styles.card,
          {
            borderColor,
            opacity: isCritical ? blinkAnim : 1
          }
        ]}
      >
        <View style={styles.rowTop}>
          <Text style={styles.name}>Machine {data.id}</Text>
          <Text style={[styles.status, { color: borderColor }]}>
            {statusText}
          </Text>
        </View>
        <Text style={styles.meta}>
          ⚙ Workers: {data.workers?.join(", ") || "—"}
        </Text>
        <View style={styles.rowMid}>
          <Text style={styles.metric}>
            🔄 RPM {data.telemetry?.rpm?.toFixed(0)}
          </Text>
          <Text style={styles.metric}>
            🌡 Temp {data.telemetry?.temperature?.toFixed(1)}°C
          </Text>
        </View>
        <View style={styles.rowMid}>
          <Text style={styles.metric}>
            🛢 Oil {data.telemetry?.oil_pressure?.toFixed(0)}
          </Text>
          <Text style={styles.metric}>
            📈 Load {data.telemetry?.engine_load?.toFixed(0)}%
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
    marginBottom: 6
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

