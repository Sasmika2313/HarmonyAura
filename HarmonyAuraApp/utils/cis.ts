export type HumanRiskInputs = {
  heartRate: number;
  restingHeartRate?: number;
  hrv?: number;
  hrvBaseline?: number;
  fatigue: number; // 0–1
};

export type MachineRiskInputs = {
  machineStress?: number; // 0–1
  degradation?: number; // 0–1
  hasCriticalFault?: boolean;
};

export type CISResult = {
  cis: number; // 0–1
  color: "green" | "yellow" | "red";
};

export function computeCIS(
  human: HumanRiskInputs,
  machine: MachineRiskInputs
): CISResult {
  const resting = human.restingHeartRate ?? 70;
  const hrvBaseline = human.hrvBaseline ?? 80;

  // Heart Rate risk
  let heartRateRisk: number;
  if (human.heartRate <= resting + 10) {
    heartRateRisk = 0;
  } else if (human.heartRate >= 120) {
    heartRateRisk = 1;
  } else {
    heartRateRisk =
      (human.heartRate - (resting + 10)) / (120 - (resting + 10));
  }

  // HRV risk
  let hrvRisk: number;
  if (human.hrv == null) {
    // If no HRV, treat as neutral mid-risk
    hrvRisk = 0.5;
  } else if (human.hrv >= hrvBaseline) {
    hrvRisk = 0;
  } else if (human.hrv <= 25) {
    hrvRisk = 1;
  } else {
    hrvRisk = (hrvBaseline - human.hrv) / (hrvBaseline - 25);
  }

  // Fatigue already 0–1
  const fatigue = clamp01(human.fatigue);

  // Machine factors
  const machineStress = clamp01(machine.machineStress ?? 0.5);
  const degradation = clamp01(machine.degradation ?? 0.3);

  // Step 2: Human risk
  const humanRisk =
    0.4 * heartRateRisk + 0.3 * hrvRisk + 0.3 * fatigue;

  // Step 3: Machine risk
  let machineRisk = 0.6 * machineStress + 0.4 * degradation;
  if (machine.hasCriticalFault) {
    machineRisk = Math.min(1, machineRisk + 0.15);
  }

  // Step 4: Final CIS
  let cis = 0.55 * humanRisk + 0.45 * machineRisk;
  cis = clamp01(cis);

  // Step 5: Color classification
  let color: CISResult["color"];
  if (cis <= 0.4) {
    color = "green";
  } else if (cis <= 0.7) {
    color = "yellow";
  } else {
    color = "red";
  }

  return { cis, color };
}

export function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

