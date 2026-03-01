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
  Pressable,
  FlatList,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions
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

function getModeIcon(mode?: string): string {
  switch (mode) {
    case "IDLE": return "⏸️";
    case "LIFT": return "🏗️";
    case "DIGGING": return "⛏️";
    case "TRAVEL": return "🚛";
    default: return "⚙️";
  }
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
    <View style={ms.dataCell}>
      <Text style={ms.cellIcon}>{icon}</Text>
      <Text style={[ms.cellLabel, { color: subtle }]}>{label}</Text>
      <Text style={[ms.cellValue, { color }]}>{value}</Text>
    </View>
  );
}

// ---- MachineDetailModal ----
function MachineDetailModal({ machine, workers, dark, onClose, onAlertWorkers }: {
  machine: Machine; workers: Worker[]; dark: boolean;
  onClose: () => void; onAlertWorkers: () => void;
}) {
  const bg = dark ? "#0F172A" : "#FFFFFF";
  const card = dark ? "#1E293B" : "#F1F5F9";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";
  const isFault = machine.status === "fault";

  const borderColor = machine.status === "healthy" ? "#16A34A" : machine.status === "warning" ? "#EAB308" : "#EF4444";
  const tel = machine.telemetry;

  const rpmHistory = useMemo(() => Array.from({ length: 12 }, (_, i) => Math.round((tel?.rpm ?? 1600) + Math.sin(i * 0.8) * 60)), [tel?.rpm]);
  const tempHistory = useMemo(() => Array.from({ length: 12 }, (_, i) => Math.round((tel?.temperature ?? 85) + Math.sin(i * 1.2) * 5)), [tel?.temperature]);
  const loadHistory = useMemo(() => Array.from({ length: 12 }, (_, i) => Math.round((tel?.engine_load ?? 50) + Math.cos(i) * 8)), [tel?.engine_load]);

  const avgCIS = useMemo(() => {
    if (!workers.length) return null;
    const scores = workers.map(w => {
      const r = computeCIS(
        { heartRate: w.vitals?.heart_rate ?? 80, fatigue: (w.vitals?.fatigue ?? 0) / 100 },
        {
          machineStress: tel ? (tel.temperature / 120) * 0.4 + (1 - tel.oil_pressure / 100) * 0.3 + (tel.engine_load / 100) * 0.3 : 0.3,
          degradation: tel ? tel.engine_load / 100 : 0.2,
          hasCriticalFault: isFault
        }
      );
      return r.cis;
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [workers, tel, isFault]);

  return (
    <Modal animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={[ms.sheet, { backgroundColor: bg, borderColor }]}>
          <View style={[ms.handle, { backgroundColor: border }]} />
          <View style={ms.modalHeader}>
            <View>
              <Text style={[ms.modalTitle, { color: text }]}>Machine {machine.id}</Text>
              <Text style={[ms.modalSub, { color: subtle }]}>
                {machine.workers?.length ?? 0} worker(s) assigned
                {machine.operating_mode ? ` - ${getModeIcon(machine.operating_mode)} ${machine.operating_mode}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isFault && (
                <TouchableOpacity style={ms.alertBtn} onPress={onAlertWorkers}>
                  <Ionicons name="notifications" size={14} color="#FFF" />
                  <Text style={ms.alertBtnText}>Alert All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={28} color={subtle} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[ms.statusBadge, { backgroundColor: borderColor + "22", borderColor }]}>
            <View style={[ms.dot, { backgroundColor: borderColor }]} />
            <Text style={[ms.statusText, { color: borderColor }]}>
              {machine.status === "healthy" ? "Healthy" : machine.status === "warning" ? "Warning" : `FAULT - ${machine.failure_type || "Evacuate Workers"}`}
            </Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={[ms.section, { color: subtle }]}>TELEMETRY</Text>
            <View style={[ms.dataGrid, { backgroundColor: card, borderColor: border }]}>
              <DataCell icon="🔄" label="RPM" value={`${tel?.rpm?.toFixed(0) ?? "-"}`} color={text} subtle={subtle} />
              <DataCell icon="🌡️" label="Temperature" value={`${tel?.temperature?.toFixed(1) ?? "-"}°C`} color={text} subtle={subtle} />
              <DataCell icon="🛢️" label="Oil Pressure" value={`${tel?.oil_pressure?.toFixed(0) ?? "-"}`} color={text} subtle={subtle} />
              <DataCell icon="📈" label="Engine Load" value={`${tel?.engine_load?.toFixed(0) ?? "-"}%`} color={text} subtle={subtle} />
              <DataCell icon="🔧" label="Hydraulic" value={`${tel?.hydraulic_pressure?.toFixed(0) ?? "-"} psi`} color={text} subtle={subtle} />
              <DataCell icon="⛽" label="Fuel Level" value={`${tel?.fuel_level?.toFixed(1) ?? "-"}%`} color={text} subtle={subtle} />
            </View>

            {(machine.operating_mode || tel?.vehicle_speed != null) && (
              <>
                <Text style={[ms.section, { color: subtle }]}>OPERATING INFO</Text>
                <View style={[ms.infoRow, { backgroundColor: card, borderColor: border }]}>
                  {machine.operating_mode && (
                    <View style={ms.infoItem}>
                      <Text style={[ms.infoLabel, { color: subtle }]}>Mode</Text>
                      <Text style={[ms.infoValue, { color: text }]}>{getModeIcon(machine.operating_mode)} {machine.operating_mode}</Text>
                    </View>
                  )}
                  {tel?.vehicle_speed != null && (
                    <View style={ms.infoItem}>
                      <Text style={[ms.infoLabel, { color: subtle }]}>Speed</Text>
                      <Text style={[ms.infoValue, { color: text }]}>{tel.vehicle_speed.toFixed(1)} km/h</Text>
                    </View>
                  )}
                  {machine.failure_type && machine.failure_type !== "NONE" && (
                    <View style={ms.infoItem}>
                      <Text style={[ms.infoLabel, { color: "#EF4444" }]}>Failure</Text>
                      <Text style={[ms.infoValue, { color: "#EF4444" }]}>{machine.failure_type}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {avgCIS !== null && (
              <>
                <Text style={[ms.section, { color: subtle }]}>AVG WORKER CIS</Text>
                <View style={[ms.cisBox, { backgroundColor: card, borderColor: avgCIS <= 0.4 ? "#16A34A" : avgCIS <= 0.7 ? "#EAB308" : "#EF4444" }]}>
                  <Text style={[ms.cisScore, { color: avgCIS <= 0.4 ? "#22C55E" : avgCIS <= 0.7 ? "#EAB308" : "#EF4444" }]}>{(avgCIS * 100).toFixed(1)}</Text>
                  <Text style={[ms.cisLabel, { color: subtle }]}>{avgCIS <= 0.4 ? "Low Risk" : avgCIS <= 0.7 ? "Moderate Risk" : "HIGH RISK"}</Text>
                </View>
              </>
            )}

            <Text style={[ms.section, { color: subtle }]}>RPM TREND</Text>
            <View style={[ms.graphCard, { backgroundColor: card, borderColor: border }]}>
              <Sparkline values={rpmHistory} color="#60A5FA" width={SCREEN_W - 80} height={60} />
              <Text style={[ms.graphNote, { color: subtle }]}>RPM - last 12 ticks</Text>
            </View>

            <Text style={[ms.section, { color: subtle }]}>TEMPERATURE TREND</Text>
            <View style={[ms.graphCard, { backgroundColor: card, borderColor: border }]}>
              <Sparkline values={tempHistory} color="#F87171" width={SCREEN_W - 80} height={60} />
              <Text style={[ms.graphNote, { color: subtle }]}>Temperature - last 12 ticks</Text>
            </View>

            <Text style={[ms.section, { color: subtle }]}>ENGINE LOAD TREND</Text>
            <View style={[ms.graphCard, { backgroundColor: card, borderColor: border }]}>
              <Sparkline values={loadHistory} color="#A78BFA" width={SCREEN_W - 80} height={60} />
              <Text style={[ms.graphNote, { color: subtle }]}>Engine load % - last 12 ticks</Text>
            </View>

            <Text style={[ms.section, { color: subtle }]}>ASSIGNED WORKERS</Text>
            {workers.length === 0 ? (
              <Text style={[ms.emptyWorkers, { color: subtle }]}>No workers assigned</Text>
            ) : (
              workers.map(w => {
                const isEvac = w.is_evacuated === true;
                const wColor = isEvac ? "#F97316" : w.is_resting ? "#60A5FA" : w.status === "safe" ? "#16A34A" : w.status === "warning" ? "#EAB308" : "#EF4444";
                return (
                  <View key={w.id} style={[ms.workerRow, { backgroundColor: card, borderColor: wColor }]}>
                    <View>
                      <Text style={[ms.workerName, { color: text }]}>{w.name || `Worker ${w.id}`}</Text>
                      <Text style={{ fontSize: 11, color: subtle }}>ID: {w.id} - HR: {w.vitals?.heart_rate?.toFixed(0)} bpm</Text>
                    </View>
                    <Text style={[ms.workerStatus, { color: wColor }]}>
                      {isEvac ? "FAULT - EVACUATED" : w.is_resting ? "Resting" : w.status === "safe" ? "Safe" : w.status === "warning" ? "Warning" : "Critical"}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---- MachineCard ----
function MachineCard({ machine, workersOnMachine, dark, onPress }: {
  machine: Machine; workersOnMachine: Worker[]; dark: boolean; onPress: () => void;
}) {
  const isFault = machine.status === "fault";
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFault) {
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
  }, [isFault]);

  const borderColor = machine.status === "healthy" ? "#16A34A" : machine.status === "warning" ? "#EAB308" : "#EF4444";
  const bg = dark
    ? isFault ? "rgba(239,68,68,0.09)" : "rgba(30,41,59,0.6)"
    : isFault ? "rgba(239,68,68,0.06)" : "#FFFFFF";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const tel = machine.telemetry;

  const machineStress = tel ? (tel.temperature / 120) * 0.4 + (1 - tel.oil_pressure / 100) * 0.3 + (tel.engine_load / 100) * 0.3 : 0.3;
  const cisColor = machineStress <= 0.4 ? "#22C55E" : machineStress <= 0.7 ? "#EAB308" : "#EF4444";

  const hasEvacuatedWorkers = workersOnMachine.some(w => w.is_evacuated === true);

  return (
    <Pressable onPress={onPress} android_ripple={{ color: borderColor + "22" }}>
      <Animated.View style={[mCardStyles.card, {
        backgroundColor: bg, borderColor,
        transform: isFault ? [{ scale: pulseAnim }] : []
      }]}>
        <View style={mCardStyles.row1}>
          <View style={{ flex: 1 }}>
            <Text style={[mCardStyles.name, { color: text }]}>Machine {machine.id}</Text>
            {machine.operating_mode && (
              <Text style={[mCardStyles.modeText, { color: subtle }]}>{getModeIcon(machine.operating_mode)} {machine.operating_mode}</Text>
            )}
          </View>
          <View style={[mCardStyles.statusBadge, { backgroundColor: borderColor + "22", borderColor }]}>
            <Text style={[mCardStyles.statusText, { color: borderColor }]}>
              {machine.status === "healthy" ? "Healthy" : machine.status === "warning" ? "Warning" : "Fault"}
            </Text>
          </View>
        </View>

        <View style={mCardStyles.row2}>
          <Ionicons name="people-outline" size={12} color={subtle} />
          <Text style={[mCardStyles.meta, { color: subtle }]}>
            Workers: {machine.workers?.length ? machine.workers.join(", ") : "None"}
          </Text>
        </View>

        <View style={mCardStyles.row3}>
          <View style={mCardStyles.metric}>
            <Text style={mCardStyles.metricIcon}>🔄</Text>
            <Text style={[mCardStyles.metricVal, { color: text }]}>{tel?.rpm?.toFixed(0) ?? "-"} rpm</Text>
          </View>
          <View style={mCardStyles.metric}>
            <Text style={mCardStyles.metricIcon}>🌡️</Text>
            <Text style={[mCardStyles.metricVal, { color: text }]}>{tel?.temperature?.toFixed(1) ?? "-"}°C</Text>
          </View>
          <View style={mCardStyles.metric}>
            <Text style={[mCardStyles.metricIcon, { fontSize: 11, color: cisColor, fontWeight: "700" }]}>
              STRESS {(machineStress * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={[mCardStyles.row3, { marginTop: 4 }]}>
          <View style={mCardStyles.metric}>
            <Text style={mCardStyles.metricIcon}>🛢️</Text>
            <Text style={[mCardStyles.metricVal, { color: text }]}>Oil {tel?.oil_pressure?.toFixed(0) ?? "-"}</Text>
          </View>
          <View style={mCardStyles.metric}>
            <Text style={mCardStyles.metricIcon}>⛽</Text>
            <Text style={[mCardStyles.metricVal, { color: text }]}>{tel?.fuel_level?.toFixed(0) ?? "-"}%</Text>
          </View>
          {tel?.vehicle_speed != null && tel.vehicle_speed > 0.5 && (
            <View style={mCardStyles.metric}>
              <Text style={mCardStyles.metricIcon}>🚛</Text>
              <Text style={[mCardStyles.metricVal, { color: text }]}>{tel.vehicle_speed.toFixed(0)} km/h</Text>
            </View>
          )}
        </View>

        {isFault && (
          <View style={mCardStyles.alertedBanner}>
            <Ionicons name="warning" size={12} color="#EF4444" />
            <Text style={mCardStyles.alertedText}>
              FAULT{machine.failure_type && machine.failure_type !== "NONE" ? ` - ${machine.failure_type}` : ""}
            </Text>
          </View>
        )}

        {hasEvacuatedWorkers && (
          <View style={[mCardStyles.alertedBanner, { borderColor: "#F97316" }]}>
            <Ionicons name="alert-circle" size={12} color="#F97316" />
            <Text style={[mCardStyles.alertedText, { color: "#F97316" }]}>WORKERS EVACUATED</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ---- Main Machines Screen ----
export default function MachinesScreen() {
  const { dark } = useTheme();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  useEffect(() => {
    const unsubM = onValue(ref(db, "machines"), snap => {
      const data = snap.val();
      if (!data) return;
      setMachines(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    const unsubW = onValue(ref(db, "workers"), snap => {
      const data = snap.val();
      if (!data) return;
      setWorkers(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
    return () => { unsubM(); unsubW(); };
  }, []);

  const alertAllWorkersOnMachine = (machine: Machine) => {
    (machine.workers ?? []).forEach(wid => {
      push(ref(db, `alerts/${wid}`), {
        type: "machine_fault", machine: machine.id,
        message: `FAULT on Machine ${machine.id}. All workers: evacuate immediately.`,
        createdAt: Date.now()
      });
    });
    setSelectedMachine(null);
  };

  const bg = dark ? "#020617" : "#F1F5F9";
  const headerBg = dark ? "#020617" : "#FFFFFF";
  const text = dark ? "#F1F5F9" : "#0F172A";
  const subtle = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "rgba(51,65,85,0.8)" : "rgba(226,232,240,1)";

  const counts = useMemo(() => ({
    total: machines.length,
    healthy: machines.filter(m => m.status === "healthy").length,
    warning: machines.filter(m => m.status === "warning").length,
    fault: machines.filter(m => m.status === "fault").length
  }), [machines]);

  const workersForMachine = (machine: Machine) => workers.filter(w => machine.workers?.includes(w.id));

  return (
    <SafeAreaView style={[mScreenStyles.root, { backgroundColor: bg }]} edges={["top"]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={headerBg} />

      <View style={[mScreenStyles.header, { backgroundColor: headerBg, borderBottomColor: border }]}>
        <View>
          <Text style={[mScreenStyles.appName, { color: text }]}>Machines</Text>
          <View style={mScreenStyles.statsRow}>
            <StatChip value={counts.total} label="Total" color="#60A5FA" />
            <StatChip value={counts.healthy} label="Healthy" color="#22C55E" />
            <StatChip value={counts.warning} label="Warning" color="#EAB308" />
            <StatChip value={counts.fault} label="Fault" color="#EF4444" />
          </View>
        </View>
        <Ionicons name="hardware-chip" size={28} color={subtle} />
      </View>

      <FlatList
        data={machines}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        ListHeaderComponent={<SiteDetailsBox dark={dark} />}
        renderItem={({ item }) => (
          <MachineCard machine={item} workersOnMachine={workersForMachine(item)} dark={dark} onPress={() => setSelectedMachine(item)} />
        )}
        ListEmptyComponent={
          <View style={mScreenStyles.empty}>
            <Ionicons name="hardware-chip-outline" size={48} color={subtle} />
            <Text style={[mScreenStyles.emptyText, { color: subtle }]}>No machines found</Text>
          </View>
        }
      />

      {selectedMachine && (
        <MachineDetailModal machine={selectedMachine} workers={workersForMachine(selectedMachine)} dark={dark}
          onClose={() => setSelectedMachine(null)}
          onAlertWorkers={() => alertAllWorkersOnMachine(selectedMachine)}
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({ value, label, color }: { value: number; label: string; color: string; }) {
  return (
    <View style={[mScreenStyles.statChip, { borderColor: color + "44" }]}>
      <Text style={[mScreenStyles.statVal, { color }]}>{value}</Text>
      <Text style={[mScreenStyles.statLabel, { color: color + "BB" }]}>{label}</Text>
    </View>
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

const mScreenStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: StyleSheet.hairlineWidth },
  appName: { fontSize: 22, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 6 },
  statChip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center" },
  statVal: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 }
});

const mCardStyles = StyleSheet.create({
  card: { marginHorizontal: 14, marginVertical: 7, padding: 14, borderRadius: 18, borderWidth: 1.5 },
  row1: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontSize: 16, fontWeight: "700" },
  modeText: { fontSize: 11, marginTop: 2 },
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

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { height: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 2, paddingHorizontal: 20, paddingTop: 12 },
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
  infoRow: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, borderWidth: 1, padding: 12, gap: 16 },
  infoItem: { minWidth: 80 },
  infoLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: "700" },
  workerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  workerName: { fontSize: 14, fontWeight: "600" },
  workerStatus: { fontSize: 12, fontWeight: "600" },
  emptyWorkers: { fontSize: 13, textAlign: "center", paddingVertical: 16 }
});
