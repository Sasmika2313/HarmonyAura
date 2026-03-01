import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

type Props = {
    score: number;
    size?: number;
};

export default function CISCircle({ score, size = 100 }: Props) {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    const color =
        score >= 80 ? "#34C759" : score >= 50 ? "#FFD60A" : "#FF3B30";

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#E5E5EA"
                    strokeWidth={8}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={8}
                    fill="none"
                    strokeDasharray={`${progress} ${circumference - progress}`}
                    strokeDashoffset={circumference / 4}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={[styles.labelContainer, { width: size, height: size }]}>
                <Text style={[styles.label, { color }]}>{score}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    labelContainer: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 22,
        fontWeight: "bold",
    },
});
