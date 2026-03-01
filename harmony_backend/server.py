# =========================================================
# HARMONY AURA - SITE SIMULATION SERVER
# Realistic data from CSV distribution ranges
# 10 Workers, 5 Machines, 1-3 workers per machine
# One random entity stressed per tick; rest stay healthy.
# =========================================================

import asyncio
import random
from contextlib import asynccontextmanager
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, db

# =========================================================
# FIREBASE INIT
# =========================================================
cred = credentials.Certificate("firebase_key.json")

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        "databaseURL":
        "https://harmonyaura-cf679-default-rtdb.asia-southeast1.firebasedatabase.app/"
    })

# =========================================================
# LOAD CSV DATA FOR REALISTIC RANGES
# =========================================================
# We read the training CSV to extract realistic distribution
# parameters for each field, so generated data looks real.

# Distribution parameters extracted from the CSV dataset
# These represent the normal operating ranges (health_label=0)
OPERATING_MODES = ["IDLE", "LIFT", "DIGGING", "TRAVEL"]

# Per-mode realistic parameter ranges from the dataset
MODE_PARAMS = {
    "IDLE": {
        "rpm":      (600, 900),
        "load":     (8, 22),
        "temp":     (65, 75),
        "oil":      (30, 42),
        "hydraulic": (1900, 2500),
        "speed":    (0.0, 0.0),
    },
    "LIFT": {
        "rpm":      (1300, 1950),
        "load":     (55, 90),
        "temp":     (68, 78),
        "oil":      (42, 60),
        "hydraulic": (4000, 5200),
        "speed":    (0.0, 5.0),
    },
    "DIGGING": {
        "rpm":      (1600, 2100),
        "load":     (70, 100),
        "temp":     (69, 80),
        "oil":      (48, 65),
        "hydraulic": (3500, 5200),
        "speed":    (0.0, 3.0),
    },
    "TRAVEL": {
        "rpm":      (1350, 1800),
        "load":     (28, 60),
        "temp":     (68, 78),
        "oil":      (45, 58),
        "hydraulic": (2500, 3500),
        "speed":    (8, 40),
    },
}


# =========================================================
# MACHINE CLASS (with CSV-realistic data)
# =========================================================
class Machine:

    def __init__(self, machine_id, workers):
        self.id = machine_id
        self.workers = workers
        self.operating_mode = random.choice(OPERATING_MODES)
        self.mode_timer = random.randint(5, 15)  # ticks before mode change

        params = MODE_PARAMS[self.operating_mode]
        self.rpm = random.uniform(*params["rpm"])
        self.temp = random.uniform(*params["temp"])
        self.oil = random.uniform(*params["oil"])
        self.load = random.uniform(*params["load"])
        self.hydraulic = random.uniform(*params["hydraulic"])
        self.speed = random.uniform(*params["speed"])
        self.fuel = random.uniform(75, 100)
        self.status = "healthy"
        self.failure_type = "NONE"

    def update(self, stressed: bool = False):
        # Mode transitions (realistic — machines change modes)
        self.mode_timer -= 1
        if self.mode_timer <= 0:
            self.operating_mode = random.choice(OPERATING_MODES)
            self.mode_timer = random.randint(5, 15)

        params = MODE_PARAMS[self.operating_mode]

        if stressed:
            # Push towards high-stress extremes (like test.csv failures)
            self.temp = float(np.clip(
                self.temp + random.uniform(1.5, 4.0), 85, 105
            ))
            self.oil = float(np.clip(
                self.oil - random.uniform(2.0, 6.0), 25, 40
            ))
            self.load = float(np.clip(
                self.load + random.uniform(5.0, 15.0), 75, 100
            ))
            self.hydraulic = float(np.clip(
                self.hydraulic + random.uniform(100, 400), 4500, 6000
            ))
            self.fuel -= random.uniform(0.02, 0.08)
            # Stressed failure types
            self.failure_type = random.choice([
                "OVERHEATING", "OIL_FAILURE", "HYDRAULIC_LEAK", "ENGINE_STALL"
            ])
        else:
            # Gently drift towards mode-appropriate values
            target_rpm = random.uniform(*params["rpm"])
            target_temp = random.uniform(*params["temp"])
            target_oil = random.uniform(*params["oil"])
            target_load = random.uniform(*params["load"])
            target_hydraulic = random.uniform(*params["hydraulic"])
            target_speed = random.uniform(*params["speed"])

            # Smoothly interpolate (like real sensor drift)
            lerp = 0.15
            self.rpm = self.rpm + (target_rpm - self.rpm) * lerp + random.gauss(0, 8)
            self.temp = self.temp + (target_temp - self.temp) * lerp + random.gauss(0, 0.5)
            self.oil = self.oil + (target_oil - self.oil) * lerp + random.gauss(0, 0.8)
            self.load = self.load + (target_load - self.load) * lerp + random.gauss(0, 1.5)
            self.hydraulic = self.hydraulic + (target_hydraulic - self.hydraulic) * lerp + random.gauss(0, 30)
            self.speed = self.speed + (target_speed - self.speed) * lerp + abs(random.gauss(0, 0.5))
            self.fuel -= random.uniform(0.005, 0.02)
            self.failure_type = "NONE"

        # Clamp all values to realistic bounds
        self.rpm = float(np.clip(self.rpm, 500, 2500))
        self.temp = float(np.clip(self.temp, 60, 110))
        self.oil = float(np.clip(self.oil, 20, 70))
        self.load = float(np.clip(self.load, 0, 100))
        self.hydraulic = float(np.clip(self.hydraulic, 1500, 6000))
        self.speed = float(np.clip(self.speed, 0, 45))
        self.fuel = float(np.clip(self.fuel, 30, 100))

        # Compute status from a stress score
        stress = (
            (self.temp / 110) * 0.3 +
            (1 - self.oil / 70) * 0.25 +
            (self.load / 100) * 0.25 +
            (self.hydraulic / 6000) * 0.1 +
            (1 - self.fuel / 100) * 0.1
        )

        if stress > 0.65:
            self.status = "fault"
        elif stress > 0.45:
            self.status = "warning"
        else:
            self.status = "healthy"

    def push(self):
        ref = db.reference(f"machines/{self.id}")
        ref.update({
            "telemetry": {
                "rpm": round(self.rpm, 2),
                "temperature": round(self.temp, 2),
                "oil_pressure": round(self.oil, 2),
                "engine_load": round(self.load, 2),
                "hydraulic_pressure": round(self.hydraulic, 2),
                "vehicle_speed": round(self.speed, 2),
                "fuel_level": round(self.fuel, 2),
            },
            "operating_mode": self.operating_mode,
            "failure_type": self.failure_type,
            "status": self.status,
            "workers": self.workers
        })

        # If machine fault -> alert all workers on it
        if self.status == "fault":
            for w in self.workers:
                db.reference(f"alerts/{w}").push({
                    "type": "machine_fault",
                    "machine": self.id,
                    "message": f"WARNING: Machine {self.id} fault ({self.failure_type})! Evacuate immediately."
                })

        print(f"Machine {self.id} -> {self.status} [{self.operating_mode}] "
              f"RPM={self.rpm:.0f} Temp={self.temp:.1f} Oil={self.oil:.0f} "
              f"Load={self.load:.0f}% Fuel={self.fuel:.1f}%")


# =========================================================
# WORKER CLASS (with realistic human vitals)
# =========================================================

# Worker name pool for more realistic display
WORKER_NAMES = [
    "Rajesh K.", "Amit S.", "Suresh P.", "Vikram J.", "Manoj T.",
    "Abdul R.", "Deepak M.", "Ravi N.", "Sanjay G.", "Arjun B."
]

class Worker:

    def __init__(self, worker_id, name):
        self.id = worker_id
        self.name = name
        # Realistic baseline vitals
        self.heart_rate = random.uniform(68, 88)
        self.body_temp = random.uniform(36.4, 37.1)
        self.fatigue = random.uniform(8, 25)
        self.hydration = random.uniform(75, 98)
        self.spo2 = random.uniform(96, 99)
        self.steps = random.randint(200, 2000)
        self.status = "safe"
        self.is_resting = False
        self.is_evacuated = False
        self.rest_ticks = 0
        self.evacuate_ticks = 0

    def update(self, stressed: bool = False):
        # If evacuated, hold evacuation state for a few ticks
        if self.is_evacuated:
            self.evacuate_ticks -= 1
            if self.evacuate_ticks <= 0:
                self.is_evacuated = False
                self.status = "safe"
            self._push_status()
            return

        # If resting, gradually recover
        if self.is_resting:
            self.rest_ticks -= 1
            self.heart_rate = float(np.clip(
                self.heart_rate - random.uniform(2, 5), 65, 78
            ))
            self.body_temp = float(np.clip(
                self.body_temp - random.uniform(0.05, 0.15), 36.3, 36.8
            ))
            self.fatigue = float(np.clip(
                self.fatigue - random.uniform(2, 5), 5, 20
            ))
            self.hydration = float(np.clip(
                self.hydration + random.uniform(1, 3), 70, 98
            ))
            self.spo2 = float(np.clip(
                self.spo2 + random.uniform(0.1, 0.3), 96, 99
            ))
            if self.rest_ticks <= 0:
                self.is_resting = False
            self.status = "safe"
            self._push_status()
            return

        # Natural fluctuation (like real wearable sensors)
        self.heart_rate += random.gauss(0, 1.5)
        self.body_temp += random.gauss(0, 0.05)
        self.fatigue += random.uniform(0, 0.4)
        self.hydration -= random.uniform(0, 0.25)
        self.spo2 += random.gauss(0, 0.1)
        self.steps += random.randint(5, 30)

        if stressed:
            # Drive vitals towards risky ranges
            self.heart_rate = float(np.clip(
                self.heart_rate + random.uniform(3, 8), 105, 135
            ))
            self.body_temp = float(np.clip(
                self.body_temp + random.uniform(0.15, 0.4), 37.5, 38.8
            ))
            self.fatigue = float(np.clip(
                self.fatigue + random.uniform(4, 8), 65, 95
            ))
            self.hydration = float(np.clip(
                self.hydration - random.uniform(3, 6), 20, 50
            ))
            self.spo2 = float(np.clip(
                self.spo2 - random.uniform(0.5, 1.5), 90, 95
            ))
        else:
            # Gently recover towards normal ranges
            self.heart_rate = float(np.clip(
                self.heart_rate - random.uniform(0.5, 2), 65, 92
            ))
            self.body_temp = float(np.clip(
                self.body_temp - random.uniform(0.02, 0.1), 36.4, 37.3
            ))
            self.fatigue = float(np.clip(
                self.fatigue - random.uniform(0.3, 1.5), 5, 35
            ))
            self.hydration = float(np.clip(
                self.hydration + random.uniform(0.2, 1), 60, 98
            ))
            self.spo2 = float(np.clip(
                self.spo2 + random.uniform(0.05, 0.2), 96, 99
            ))

        # Hard clamp
        self.heart_rate = float(np.clip(self.heart_rate, 58, 140))
        self.body_temp = float(np.clip(self.body_temp, 36, 39))
        self.fatigue = float(np.clip(self.fatigue, 0, 100))
        self.hydration = float(np.clip(self.hydration, 0, 100))
        self.spo2 = float(np.clip(self.spo2, 88, 100))

        # Risk logic (multi-factor)
        risk = (
            (self.heart_rate / 140) * 0.25 +
            (self.body_temp / 39) * 0.25 +
            (self.fatigue / 100) * 0.2 +
            (1 - self.hydration / 100) * 0.15 +
            (1 - self.spo2 / 100) * 0.15
        )

        if risk > 0.7:
            self.status = "issue"
        elif risk > 0.45:
            self.status = "warning"
        else:
            self.status = "safe"

        self._push_status()

    def _push_status(self):
        """Update vitals & status in Firebase."""
        ref = db.reference(f"workers/{self.id}")
        ref.update({
            "vitals": {
                "heart_rate": round(self.heart_rate, 1),
                "body_temperature": round(self.body_temp, 2),
                "fatigue": round(self.fatigue, 1),
                "hydration": round(self.hydration, 1),
                "spo2": round(self.spo2, 1),
                "steps": self.steps,
            },
            "name": self.name,
            "status": self.status,
            "is_resting": self.is_resting,
            "is_evacuated": self.is_evacuated
        })

        # If worker issue -> alert only that worker
        if self.status == "issue":
            db.reference(f"alerts/{self.id}").push({
                "type": "health_issue",
                "message": "ALERT: You are unfit. Take rest immediately."
            })

        status_icon = "[REST]" if self.is_resting else ("[!]" if self.status == "issue" else "[OK]")
        print(f"Worker {self.id} ({self.name}) -> {self.status} {status_icon} "
              f"HR={self.heart_rate:.0f} Temp={self.body_temp:.1f} "
              f"Fat={self.fatigue:.0f} Hyd={self.hydration:.0f}%")

    def trigger_rest(self):
        """Force worker into resting state (supervisor alert response)."""
        self.is_resting = True
        self.is_evacuated = False
        self.rest_ticks = random.randint(5, 10)
        self.status = "safe"
        db.reference(f"workers/{self.id}").update({
            "status": "safe",
            "is_resting": True,
            "is_evacuated": False
        })
        print(f">> Worker {self.id} ({self.name}) is now RESTING for {self.rest_ticks} ticks")

    def trigger_evacuate(self):
        """Force worker into evacuated state (machine fault)."""
        self.is_evacuated = True
        self.evacuate_ticks = random.randint(8, 15)
        self.status = "evacuated"
        db.reference(f"workers/{self.id}").update({
            "status": "evacuated",
            "is_evacuated": True
        })
        print(f">> Worker {self.id} ({self.name}) EVACUATED")


# =========================================================
# MACHINE <-> WORKER MAPPING
# 4 machines, 10 workers
# =========================================================
machine_map = {
    "M1": ["W1", "W3", "W9"],
    "M2": ["W6", "W7"],
    "M3": ["W2", "W8"],
    "M4": ["W4", "W5", "W10"],
}

machines = [
    Machine(mid, wkrs)
    for mid, wkrs in machine_map.items()
]

workers = [
    Worker(f"W{i}", WORKER_NAMES[i - 1]) for i in range(1, 11)
]

# =========================================================
# SIMULATION LOOP
# Only ONE random entity is stressed per tick.
# =========================================================
async def simulation_loop():

    # Clear old stale data from Firebase on startup
    db.reference("machines").delete()
    db.reference("workers").delete()
    db.reference("alerts").delete()
    print(">> Cleared old Firebase data")

    # Push site details to Firebase
    db.reference("site").set({
        "site_name": "Kochi Metro Construction Site",
        "area": "Palarivattom Junction - Phase 2",
        "humidity": 72.0,
        "temperature": 32.5,
        "wind_speed": 12.0,
        "weather": "Partly Cloudy",
        "aqi": 78,
        "uv_index": 7.2
    })

    print(">> Site Simulation Started - 4 machines, 10 workers")

    while True:

        # ── Pick ONE entity to stress this tick ──
        # Most ticks no stress (80% normal, 20% slight stress)
        if random.random() < 0.2:
            entity_type = random.choice(["machine", "worker"])
            if entity_type == "machine":
                stressed_machine = random.choice(machines)
                stressed_id_m = stressed_machine.id
                stressed_id_w = None
            else:
                stressed_worker = random.choice(workers)
                stressed_id_w = stressed_worker.id
                stressed_id_m = None
        else:
            stressed_id_m = None
            stressed_id_w = None

        # ── Check for Firebase commands (from the app) ──
        try:
            cmd_ref = db.reference("commands")
            cmds = cmd_ref.get()
            if cmds:
                for cmd_key, cmd_val in cmds.items():
                    action = cmd_val.get("action", "") if isinstance(cmd_val, dict) else ""
                    if action == "trigger_critical":
                        result = await trigger_critical("alternate")
                        db.reference(f"command_results/{cmd_key}").set(result)
                        print(f"[CMD] trigger_critical -> {result}")
                    elif action == "alert_worker":
                        wid = cmd_val.get("worker_id", "")
                        result = await alert_worker(wid)
                        db.reference(f"command_results/{cmd_key}").set(result)
                        print(f"[CMD] alert_worker {wid} -> {result}")
                # Clear processed commands
                cmd_ref.delete()
        except Exception as e:
            print(f"[CMD ERROR] {e}")

        # ── Update machines ──
        for m in machines:
            m.update(stressed=(m.id == stressed_id_m))
            m.push()

        # ── Update workers ──
        for w in workers:
            w.update(stressed=(w.id == stressed_id_w))

        if stressed_id_m:
            label = f"Machine {stressed_id_m}"
        elif stressed_id_w:
            label = f"Worker {stressed_id_w}"
        else:
            label = "none (all normal)"
        print(f"[tick] stressed={label}")

        await asyncio.sleep(2)


# =========================================================
# CRITICAL SITUATION TRIGGER (ALTERNATING)
# First click -> human, next click -> machine, etc.
# =========================================================
critical_active = False
critical_entity = None
next_critical_type = "human"  # alternates: human -> machine -> human -> ...

async def trigger_critical(target: str = "alternate"):
    """
    Trigger a critical situation.
    Uses alternating pattern: human -> machine -> human -> ...
    """
    global critical_active, critical_entity, next_critical_type

    # Use alternating pattern
    if target == "alternate":
        target = next_critical_type
        # Flip for next call
        next_critical_type = "machine" if next_critical_type == "human" else "human"

    if target == "human":
        worker = random.choice(workers)
        # Force immediate critical state
        worker.heart_rate = random.uniform(115, 135)
        worker.body_temp = random.uniform(38.0, 38.8)
        worker.fatigue = random.uniform(75, 95)
        worker.hydration = random.uniform(20, 40)
        worker.spo2 = random.uniform(90, 93)
        worker.status = "issue"
        worker.is_evacuated = False
        worker._push_status()

        db.reference(f"alerts/{worker.id}").push({
            "type": "critical_alert",
            "message": f"CRITICAL: Worker {worker.name} vitals are dangerous! Immediate attention required."
        })

        critical_active = True
        critical_entity = {"type": "human", "id": worker.id, "name": worker.name}
        print(f"[CRITICAL] triggered on Worker {worker.id} ({worker.name})")
        return {"status": "critical", "type": "human", "id": worker.id, "name": worker.name}

    else:
        # Pick a machine that has workers
        machines_with_workers = [m for m in machines if len(m.workers) > 0]
        machine = random.choice(machines_with_workers) if machines_with_workers else random.choice(machines)
        # Force immediate fault state
        machine.temp = random.uniform(95, 105)
        machine.oil = random.uniform(22, 30)
        machine.load = random.uniform(85, 100)
        machine.hydraulic = random.uniform(5000, 6000)
        machine.status = "fault"
        machine.failure_type = random.choice(["OVERHEATING", "OIL_FAILURE", "HYDRAULIC_LEAK"])
        machine.push()

        # Evacuate all workers on this machine
        for wid in machine.workers:
            for w in workers:
                if w.id == wid:
                    w.trigger_evacuate()
            db.reference(f"alerts/{wid}").push({
                "type": "machine_fault",
                "machine": machine.id,
                "message": f"CRITICAL: Machine {machine.id} FAULT ({machine.failure_type})! Evacuate NOW."
            })

        critical_active = True
        critical_entity = {"type": "machine", "id": machine.id, "failure": machine.failure_type}
        print(f"[CRITICAL] triggered on Machine {machine.id} ({machine.failure_type})")
        return {
            "status": "critical",
            "type": "machine",
            "id": machine.id,
            "failure": machine.failure_type,
            "evacuated_workers": machine.workers
        }


async def alert_worker(worker_id: str):
    """Supervisor alerts a worker, triggering rest."""
    for w in workers:
        if w.id == worker_id:
            w.trigger_rest()
            return {"status": "ok", "message": f"Worker {worker_id} is now resting"}
    return {"status": "error", "message": f"Worker {worker_id} not found"}


# =========================================================
# LIFESPAN
# =========================================================
@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(simulation_loop())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

# Enable CORS for the React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ENDPOINTS
# =========================================================
@app.get("/")
async def root():
    return {"message": "Harmony Aura Site Simulation Running"}


@app.post("/critical")
async def critical_endpoint():
    """Trigger a critical situation (alternating human/machine)."""
    result = await trigger_critical("alternate")
    return result


@app.post("/alert/{worker_id}")
async def alert_worker_endpoint(worker_id: str):
    """Supervisor alerts a worker to rest."""
    result = await alert_worker(worker_id)
    return result


@app.get("/site")
async def site_details():
    """Get site environment details."""
    return {
        "site_name": "Kochi Metro Construction Site",
        "area": "Palarivattom Junction - Phase 2",
        "humidity": round(72.0 + random.uniform(-2, 2), 1),
        "temperature": round(32.5 + random.uniform(-1, 1), 1),
        "wind_speed": round(12.0 + random.uniform(-2, 2), 1),
        "weather": "Partly Cloudy",
        "aqi": 78,
        "uv_index": 7.2
    }


@app.get("/status")
async def status_endpoint():
    """Get current simulation status."""
    return {
        "machines": [
            {
                "id": m.id,
                "status": m.status,
                "mode": m.operating_mode,
                "workers": m.workers
            }
            for m in machines
        ],
        "workers": [
            {
                "id": w.id,
                "name": w.name,
                "status": w.status,
                "is_resting": w.is_resting,
                "is_evacuated": w.is_evacuated
            }
            for w in workers
        ]
    }
