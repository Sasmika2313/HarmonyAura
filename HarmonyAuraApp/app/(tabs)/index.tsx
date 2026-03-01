import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Switch,
  Pressable,
  ScrollView,
  Animated,
  FlatList,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ref, onValue, push } from "firebase/database";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline } from "react-native-svg";

import { db } from "../../services/firebase";
import { Machine, Worker } from "../../types";
import { computeCIS } from "../../utils/cis";
import { useTheme } from "../../context/ThemeContext";

const SCREEN_W = Dimensions.get("window").width;



// Machine map mirrored from server
const MACHINE_MAP: Record<string, string> = {
  W1: "M1", W3: "M1", W9: "M1",
  W6: "M2", W7: "M2",
  W2: "M3", W8: "M3",
  W4: "M4", W5: "M4", W10: "M4"
};

type FilterKey = "all" | "critical" | "warning" | "safe";

// ---- Sparkline ----
function Sparkline({ values, color, width = 80, height = 32 }: {
  values: number[]; color: string; width?: number; height?: number;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}


function SiteDetailsBox({ dark }: { dark: boolean }) {
  const [site, setSite] = useState<any>(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "site"), snap => {
      setSite(snap.val());
    });
    return () => unsub();
  }, []);

  const bg = dark ? "#0F172A" : "#FFFFFF";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";

  if (!site) return null;

  return (
    <View style={[siteStyles.box, { backgroundColor: bg, borderColor: border }]}>
      <View style={siteStyles.row1}>
        <Ionicons name="location" size={13} color="#3B82F6" />
        <Text style={[siteStyles.title, { color: text }]}>Site Details</Text>
        <Text style={[siteStyles.siteName, { color: subtle }]}> - {site.site_name}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={siteStyles.chips}>
        <Text style={[siteStyles.tag, { color: text, backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>🌡 {site.temperature}°C</Text>
        <Text style={[siteStyles.tag, { color: text, backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>💧 {site.humidity}%</Text>
        <Text style={[siteStyles.tag, { color: text, backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>💨 {site.wind_speed} km/h</Text>
        <Text style={[siteStyles.tag, { color: text, backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>☁️ {site.weather}</Text>
        <Text style={[siteStyles.tag, { color: text, backgroundColor: dark ? "#1E293B" : "#F1F5F9" }]}>AQI {site.aqi}</Text>
      </ScrollView>
    </View>
  );
}

// ---- DataCell ----
function DataCell({ icon, label, value, color, subtle }: {
  icon: string; label: string; value: string; color: string; subtle: string;
}) {
  return (
    <View style={hStyles.dataCell}>
      <Text style={hStyles.cellIcon}>{icon}</Text>
      <Text style={[hStyles.cellLabel, { color: subtle }]}>{label}</Text>
      <Text style={[hStyles.cellValue, { color }]}>{value}</Text>
    </View>
  );
}

// ---- Human Detail Modal ----
function HumanDetailModal({ worker, machine, dark, onClose, onAlert }: {
  worker: Worker; machine?: Machine; dark: boolean;
  onClose: () => void; onAlert: () => void;
}) {
  const bg = dark ? "#0F172A" : "#FFFFFF";
  const card = dark ? "#1E293B" : "#F1F5F9";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";
  const vitals = worker.vitals;
  const tel = machine?.telemetry;

  const isCritical = worker.status === "issue";
  const isEvacuated = worker.is_evacuated === true;
  const borderColor =
    isEvacuated ? "#F97316"
      : worker.status === "safe" ? "#16A34A"
        : worker.status === "warning" ? "#EAB308"
          : "#EF4444";

  const hrHistory = useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      Math.round((vitals?.heart_rate ?? 80) + Math.sin(i) * 5)
    ), [vitals?.heart_rate]);

  const fatigueHistory = useMemo(() =>
    Array.from({ length: 12 }, (_, i) =>
      Math.round((vitals?.fatigue ?? 30) + Math.cos(i * 1.3) * 8)
    ), [vitals?.fatigue]);

  const cisResult = computeCIS(
    { heartRate: vitals?.heart_rate ?? 80, fatigue: (vitals?.fatigue ?? 0) / 100 },
    {
      machineStress: tel ? (tel.temperature / 120) * 0.4 + (1 - tel.oil_pressure / 100) * 0.3 + (tel.engine_load / 100) * 0.3 : 0.3,
      degradation: tel ? tel.engine_load / 100 : 0.2,
      hasCriticalFault: machine?.status === "fault"
    }
  );

  return (
    <Modal animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={hStyles.overlay}>
        <View style={[hStyles.sheet, { backgroundColor: bg, borderColor }]}>
          <View style={[hStyles.handle, { backgroundColor: border }]} />
          <View style={hStyles.modalHeader}>
            <View>
              <Text style={[hStyles.modalTitle, { color: text }]}>{worker.name || `Worker ${worker.id}`}</Text>
              <Text style={[hStyles.modalSub, { color: subtle }]}>
                {isEvacuated ? "FAULT - EVACUATED"
                  : worker.is_resting ? "Currently Resting"
                    : MACHINE_MAP[worker.id] ? `On Machine ${MACHINE_MAP[worker.id]}` : "Unassigned"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isCritical && (
                <TouchableOpacity style={hStyles.alertBtn} onPress={onAlert}>
                  <Ionicons name="notifications" size={14} color="#FFF" />
                  <Text style={hStyles.alertBtnText}>Alert</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={28} color={subtle} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[hStyles.statusBadge, { backgroundColor: borderColor + "22", borderColor }]}>
            <View style={[hStyles.dot, { backgroundColor: borderColor }]} />
            <Text style={[hStyles.statusText, { color: borderColor }]}>
              {isEvacuated ? "FAULT - EVACUATED"
                : worker.is_resting ? "Resting - Recovering"
                  : worker.status === "safe" ? "Safe"
                    : worker.status === "warning" ? "Warning"
                      : "Critical - Needs Attention"}
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[hStyles.section, { color: subtle }]}>VITALS</Text>
            <View style={[hStyles.dataGrid, { backgroundColor: card, borderColor: border }]}>
              <DataCell icon="❤️" label="Heart Rate" value={`${vitals?.heart_rate?.toFixed(0)} bpm`} color={text} subtle={subtle} />
              <DataCell icon="🌡️" label="Body Temp" value={`${vitals?.body_temperature?.toFixed(1)}°C`} color={text} subtle={subtle} />
              <DataCell icon="⚡" label="Fatigue" value={`${vitals?.fatigue?.toFixed(0)}/100`} color={text} subtle={subtle} />
              <DataCell icon="💧" label="Hydration" value={`${vitals?.hydration?.toFixed(0)}%`} color={text} subtle={subtle} />
              <DataCell icon="🫁" label="SpO2" value={`${vitals?.spo2?.toFixed(1) ?? "-"}%`} color={text} subtle={subtle} />
              <DataCell icon="👟" label="Steps" value={`${vitals?.steps ?? "-"}`} color={text} subtle={subtle} />
            </View>

            <Text style={[hStyles.section, { color: subtle }]}>COMPOSITE INTEGRATION SCORE</Text>
            <View style={[hStyles.cisBox, { backgroundColor: card, borderColor: cisResult.color === "green" ? "#16A34A" : cisResult.color === "yellow" ? "#EAB308" : "#EF4444" }]}>
              <Text style={[hStyles.cisScore, { color: cisResult.color === "green" ? "#22C55E" : cisResult.color === "yellow" ? "#EAB308" : "#EF4444" }]}>
                {(cisResult.cis * 100).toFixed(1)}
              </Text>
              <Text style={[hStyles.cisLabel, { color: subtle }]}>
                {cisResult.color === "green" ? "Low Risk" : cisResult.color === "yellow" ? "Moderate Risk" : "HIGH RISK"}
              </Text>
            </View>

            <Text style={[hStyles.section, { color: subtle }]}>HEART RATE TREND</Text>
            <View style={[hStyles.graphCard, { backgroundColor: card, borderColor: border }]}>
              <Sparkline values={hrHistory} color="#F87171" width={SCREEN_W - 80} height={60} />
              <Text style={[hStyles.graphNote, { color: subtle }]}>Live heart rate - last 12 ticks</Text>
            </View>

            <Text style={[hStyles.section, { color: subtle }]}>FATIGUE TREND</Text>
            <View style={[hStyles.graphCard, { backgroundColor: card, borderColor: border }]}>
              <Sparkline values={fatigueHistory} color="#FB923C" width={SCREEN_W - 80} height={60} />
              <Text style={[hStyles.graphNote, { color: subtle }]}>Fatigue level - last 12 ticks</Text>
            </View>

            {machine && (
              <>
                <Text style={[hStyles.section, { color: subtle }]}>ASSIGNED MACHINE - {machine.id}</Text>
                <View style={[hStyles.dataGrid, { backgroundColor: card, borderColor: border }]}>
                  <DataCell icon="🔄" label="RPM" value={`${machine.telemetry?.rpm?.toFixed(0)}`} color={text} subtle={subtle} />
                  <DataCell icon="🌡️" label="Temp" value={`${machine.telemetry?.temperature?.toFixed(1)}°C`} color={text} subtle={subtle} />
                  <DataCell icon="🛢️" label="Oil Pres." value={`${machine.telemetry?.oil_pressure?.toFixed(0)}`} color={text} subtle={subtle} />
                  <DataCell icon="📈" label="Engine Load" value={`${machine.telemetry?.engine_load?.toFixed(0)}%`} color={text} subtle={subtle} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---- HumanCard ----
function HumanCard({ worker, machine, dark, onPress }: {
  worker: Worker; machine?: Machine; dark: boolean; onPress: () => void;
}) {
  const isCritical = worker.status === "issue";
  const isResting = worker.is_resting === true;
  const isEvacuated = worker.is_evacuated === true;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCritical || isEvacuated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isCritical, isEvacuated]);

  const borderColor =
    isEvacuated ? "#F97316"
      : isResting ? "#60A5FA"
        : worker.status === "safe" ? "#16A34A"
          : worker.status === "warning" ? "#EAB308"
            : "#EF4444";

  const bg = dark
    ? isEvacuated ? "rgba(249,115,22,0.12)"
      : isResting ? "rgba(96,165,250,0.09)"
        : worker.status === "issue" ? "rgba(239,68,68,0.09)"
          : "rgba(30,41,59,0.6)"
    : isEvacuated ? "rgba(249,115,22,0.08)"
      : isResting ? "rgba(96,165,250,0.06)"
        : worker.status === "issue" ? "rgba(239,68,68,0.06)"
          : "#FFFFFF";

  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const machineId = MACHINE_MAP[worker.id];

  const cisResult = computeCIS(
    { heartRate: worker.vitals?.heart_rate ?? 80, fatigue: (worker.vitals?.fatigue ?? 0) / 100 },
    {
      machineStress: machine?.telemetry ? (machine.telemetry.temperature / 120) * 0.4 + (1 - machine.telemetry.oil_pressure / 100) * 0.3 + (machine.telemetry.engine_load / 100) * 0.3 : 0.3,
      degradation: machine?.telemetry ? machine.telemetry.engine_load / 100 : 0.2,
      hasCriticalFault: machine?.status === "fault"
    }
  );
  const cisColor = cisResult.color === "green" ? "#22C55E" : cisResult.color === "yellow" ? "#EAB308" : "#EF4444";

  return (
    <Pressable onPress={onPress} android_ripple={{ color: borderColor + "22" }}>
      <Animated.View
        style={[cardStyles.card, {
          backgroundColor: bg, borderColor,
          transform: (isCritical || isEvacuated) ? [{ scale: pulseAnim }] : []
        }]}
      >
        <View style={cardStyles.row1}>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.name, { color: text }]}>{worker.name || `Worker ${worker.id}`}</Text>
            <Text style={[cardStyles.workerId, { color: subtle }]}>ID: {worker.id}</Text>
          </View>
          <View style={[cardStyles.statusBadge, { backgroundColor: borderColor + "22", borderColor }]}>
            <Text style={[cardStyles.statusText, { color: borderColor }]}>
              {isEvacuated ? "FAULT - EVACUATED"
                : isResting ? "Resting"
                  : worker.status === "safe" ? "Safe"
                    : worker.status === "warning" ? "Warning"
                      : "Critical"}
            </Text>
          </View>
        </View>

        <View style={cardStyles.row2}>
          <Ionicons name="hardware-chip-outline" size={12} color={subtle} />
          <Text style={[cardStyles.meta, { color: subtle }]}>
            {machineId ? `Machine ${machineId}` : "Unassigned"}
          </Text>
        </View>

        <View style={cardStyles.row3}>
          <View style={cardStyles.metric}>
            <Text style={cardStyles.metricIcon}>❤️</Text>
            <Text style={[cardStyles.metricVal, { color: text }]}>{worker.vitals?.heart_rate?.toFixed(0)} bpm</Text>
          </View>
          <View style={cardStyles.metric}>
            <Text style={cardStyles.metricIcon}>⚡</Text>
            <Text style={[cardStyles.metricVal, { color: text }]}>{worker.vitals?.fatigue?.toFixed(0)}%</Text>
          </View>
          <View style={cardStyles.metric}>
            <Text style={cardStyles.metricIcon}>💧</Text>
            <Text style={[cardStyles.metricVal, { color: text }]}>{worker.vitals?.hydration?.toFixed(0)}%</Text>
          </View>
          <View style={cardStyles.metric}>
            <Text style={[cardStyles.metricIcon, { fontSize: 11, color: cisColor, fontWeight: "700" }]}>
              CIS {(cisResult.cis * 100).toFixed(0)}
            </Text>
          </View>
        </View>

        {isCritical && (
          <View style={cardStyles.alertedBanner}>
            <Ionicons name="warning" size={12} color="#EF4444" />
            <Text style={cardStyles.alertedText}>ALERT ACTIVE</Text>
          </View>
        )}

        {isResting && !isEvacuated && (
          <View style={[cardStyles.alertedBanner, { borderColor: "#60A5FA" }]}>
            <Ionicons name="moon-outline" size={12} color="#60A5FA" />
            <Text style={[cardStyles.alertedText, { color: "#60A5FA" }]}>RESTING - RECOVERING</Text>
          </View>
        )}

        {isEvacuated && (
          <View style={[cardStyles.alertedBanner, { borderColor: "#F97316" }]}>
            <Ionicons name="alert-circle" size={12} color="#F97316" />
            <Text style={[cardStyles.alertedText, { color: "#F97316" }]}>FAULT - EVACUATED</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ---- Main Screen ----
export default function HumansScreen() {
  const { dark, setDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [triggeringCritical, setTriggeringCritical] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const unsubW = onValue(ref(db, "workers"), (snap) => {
      const data = snap.val();
      if (!data) return;
      setWorkers(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    const unsubM = onValue(ref(db, "machines"), (snap) => {
      const data = snap.val();
      if (!data) return;
      setMachines(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => { unsubW(); unsubM(); };
  }, []);

  const getMachineForWorker = (wid: string) => machines.find(m => m.workers?.includes(wid));

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (filter === "all") return true;
      if (filter === "critical") return w.status === "issue" || w.status === "evacuated";
      if (filter === "warning") return w.status === "warning";
      if (filter === "safe") return w.status === "safe";
      return true;
    });
  }, [workers, filter]);

  const counts = useMemo(() => ({
    all: workers.length,
    critical: workers.filter(w => w.status === "issue" || w.status === "evacuated").length,
    warning: workers.filter(w => w.status === "warning").length,
    safe: workers.filter(w => w.status === "safe").length
  }), [workers]);

  const sendAlert = (workerId: string) => {
    // Write command to Firebase - server will pick it up
    push(ref(db, "commands"), {
      action: "alert_worker",
      worker_id: workerId,
      createdAt: Date.now()
    });
  };

  const triggerCritical = async () => {
    setTriggeringCritical(true);
    setMenuOpen(false);

    // Write command to Firebase - server picks it up on next tick
    const cmdRef = push(ref(db, "commands"), {
      action: "trigger_critical",
      createdAt: Date.now()
    });

    // Wait for the result from the server (via Firebase)
    const cmdId = cmdRef.key;
    const resultRef = ref(db, `command_results/${cmdId}`);
    let timeout: any = null;
    const unsub = onValue(resultRef, (snap) => {
      const data = snap.val();
      if (data) {
        unsub();
        if (timeout) clearTimeout(timeout);
        const msg = data.type === "human"
          ? `Worker ${data.name || data.id} is now in CRITICAL state!`
          : `Machine ${data.id} has a ${data.failure} FAULT! Workers evacuated.`;
        Alert.alert("Critical Triggered", msg);
        setTriggeringCritical(false);
      }
    });

    // Timeout after 8 seconds
    timeout = setTimeout(() => {
      unsub();
      Alert.alert("Sent", "Critical command sent. The server will process it on the next tick.");
      setTriggeringCritical(false);
    }, 8000);
  };

  const bg = dark ? "#020617" : "#F1F5F9";
  const headerBg = dark ? "#020617" : "#FFFFFF";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "rgba(51,65,85,0.8)" : "rgba(226,232,240,1)";

  if (showWelcome) {
    return (
      <View style={splashStyles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        <View style={splashStyles.glow} />
        <Text style={splashStyles.title}>Welcome to</Text>
        <Text style={splashStyles.brand}>Harmony Aura</Text>
        <Text style={splashStyles.sub}>Site Safety Intelligence</Text>
      </View>
    );
  }

  const selectedMachine = selectedWorker ? getMachineForWorker(selectedWorker.id) : undefined;

  return (
    <SafeAreaView style={[mainStyles.root, { backgroundColor: bg }]} edges={["top"]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={headerBg} />

      {/* Header */}
      <View style={[mainStyles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <View>
          <Text style={[mainStyles.appName, { color: text }]}>Harmony Aura</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
            {(["all", "critical", "warning", "safe"] as FilterKey[]).map(k => {
              const active = filter === k;
              const chipColor = k === "critical" ? "#EF4444" : k === "warning" ? "#EAB308" : k === "safe" ? "#22C55E" : "#60A5FA";
              return (
                <Pressable key={k} onPress={() => setFilter(k)}
                  style={[mainStyles.chip, {
                    backgroundColor: active ? chipColor + "33" : dark ? "rgba(30,41,59,0.8)" : "#E2E8F0",
                    borderColor: active ? chipColor : "transparent", borderWidth: active ? 1 : 0
                  }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: active ? chipColor : dark ? "#94A3B8" : "#64748B" }}>
                    {k.charAt(0).toUpperCase() + k.slice(1)} <Text style={{ fontWeight: "700" }}>{counts[k]}</Text>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={mainStyles.headerRight}>
          <Pressable onPress={() => setMenuOpen(v => !v)}
            style={[mainStyles.burgerBtn, { backgroundColor: dark ? "#1E293B" : "#E2E8F0", borderColor: border }]}>
            <Ionicons name={menuOpen ? "close" : "menu"} size={20} color={text} />
          </Pressable>
        </View>
      </View>

      {/* Burger Menu - only Critical + Theme toggle */}
      {menuOpen && (
        <View style={[mainStyles.dropdown, { backgroundColor: headerBg, borderColor: border }]}>
          <Pressable style={mainStyles.dropdownItem} onPress={triggerCritical} disabled={triggeringCritical}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={[mainStyles.dropdownLabel, { color: "#EF4444", fontWeight: "700" }]}>
              {triggeringCritical ? "Triggering..." : "Critical"}
            </Text>
            {triggeringCritical && <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: "auto" }} />}
          </Pressable>
          <View style={[mainStyles.dropdownDivider, { backgroundColor: border }]} />
          <View style={mainStyles.dropdownItem}>
            <Ionicons name={dark ? "moon" : "sunny"} size={16} color={text} />
            <Text style={[mainStyles.dropdownLabel, { color: text }]}>{dark ? "Dark Mode" : "Light Mode"}</Text>
            <Switch value={dark} onValueChange={setDark} trackColor={{ false: "#CBD5E1", true: "#3B82F6" }}
              thumbColor="#fff" style={{ marginLeft: "auto" }} />
          </View>
        </View>
      )}

      {/* Content */}
      <FlatList
        data={filteredWorkers}
        keyExtractor={w => w.id}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        ListHeaderComponent={<SiteDetailsBox dark={dark} />}
        renderItem={({ item }) => (
          <HumanCard worker={item} machine={getMachineForWorker(item.id)} dark={dark} onPress={() => setSelectedWorker(item)} />
        )}
        ListEmptyComponent={
          <View style={mainStyles.empty}>
            <Ionicons name="people-outline" size={48} color={subtle} />
            <Text style={[mainStyles.emptyText, { color: subtle }]}>No workers found</Text>
          </View>
        }
      />

      {selectedWorker && (
        <HumanDetailModal worker={selectedWorker} machine={selectedMachine} dark={dark}
          onClose={() => setSelectedWorker(null)}
          onAlert={() => { sendAlert(selectedWorker.id); setSelectedWorker(null); }}
        />
      )}
    </SafeAreaView>
  );
}

// ---- Styles ----
const siteStyles = StyleSheet.create({
  box: { marginHorizontal: 14, marginTop: 4, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  row1: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  title: { fontSize: 13, fontWeight: "700" },
  siteName: { fontSize: 11 },
  chips: { gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: "600", overflow: "hidden" }
});

const splashStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(59,130,246,0.12)", top: "30%" },
  title: { color: "#94A3B8", fontSize: 16, letterSpacing: 3 },
  brand: { color: "#F1F5F9", fontSize: 32, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  sub: { color: "#60A5FA", fontSize: 12, letterSpacing: 2, marginTop: 8 }
});

const mainStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: StyleSheet.hairlineWidth },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: 0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  burgerBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dropdown: { position: "absolute", top: 115, right: 16, zIndex: 999, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4, minWidth: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 12 },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  dropdownLabel: { fontSize: 14, fontWeight: "500" },
  dropdownDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 }
});

const cardStyles = StyleSheet.create({
  card: { marginHorizontal: 14, marginVertical: 7, padding: 14, borderRadius: 18, borderWidth: 1.5 },
  row1: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontSize: 16, fontWeight: "700" },
  workerId: { fontSize: 11, marginTop: 1 },
  statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  row2: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  meta: { fontSize: 12 },
  row3: { flexDirection: "row", gap: 12 },
  metric: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricIcon: { fontSize: 13 },
  metricVal: { fontSize: 12, fontWeight: "500" },
  alertedBanner: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#EF4444" },
  alertedText: { color: "#EF4444", fontSize: 11, fontWeight: "700", letterSpacing: 1 }
});

const hStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { height: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 2, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 999, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "800" },
  modalSub: { fontSize: 13, marginTop: 2 },
  alertBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#DC2626", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  alertBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  statusBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "600" },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  dataGrid: { borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap" },
  dataCell: { width: "50%", padding: 14, alignItems: "flex-start" },
  cellIcon: { fontSize: 20, marginBottom: 4 },
  cellLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, marginBottom: 3 },
  cellValue: { fontSize: 16, fontWeight: "700" },
  cisBox: { borderRadius: 16, borderWidth: 2, alignItems: "center", padding: 20 },
  cisScore: { fontSize: 48, fontWeight: "800" },
  cisLabel: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  graphCard: { borderRadius: 14, borderWidth: 1, padding: 12 },
  graphNote: { fontSize: 11, marginTop: 6 },
  machineStatus: { borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", marginTop: 8 }
});
