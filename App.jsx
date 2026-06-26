import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIGNAL_CYCLE = { GREEN: "green", YELLOW: "yellow", RED: "red" };

const VEHICLE_TYPES = {
  CAR: "car",
  TRUCK: "truck",
  BUS: "bus",
  TWO_WHEELER: "two_wheeler",
  BICYCLE: "bicycle",
};

const INITIAL_LANES = [
  { id: 1, name: "Lane A", direction: "North → South", vehicles: [], signal: SIGNAL_CYCLE.GREEN, timer: 30, density: 0, violation: false },
  { id: 2, name: "Lane B", direction: "East → West", vehicles: [], signal: SIGNAL_CYCLE.RED, timer: 30, density: 0, violation: false },
  { id: 3, name: "Lane C", direction: "South → North", vehicles: [], signal: SIGNAL_CYCLE.RED, timer: 30, density: 0, violation: false },
  { id: 4, name: "Lane D", direction: "West → East", vehicles: [], signal: SIGNAL_CYCLE.RED, timer: 30, density: 0, violation: false },
];

const HELMET_MESSAGES = {
  detected: "✅ Helmet Detected — Signal Cleared",
  missing: "🚨 No Helmet — Signal Held RED",
  checking: "🔍 AI Scanning Rider...",
  clear: "",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// FIXED: Generates a completely unique string ID using time + random string
function generateVehicle() {
  const type = randomItem(Object.values(VEHICLE_TYPES));
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  return {
    id: uniqueId,
    type,
    speed: randomBetween(20, 80),
    plate: `KA${randomBetween(10,99)} ${String.fromCharCode(65+randomBetween(0,25))}${randomBetween(1000,9999)}`,
    hasHelmet: type === VEHICLE_TYPES.TWO_WHEELER ? Math.random() > 0.4 : null,
    detected: Date.now(),
  };
}

function densityColor(d) {
  if (d < 30) return "#00e5a0";
  if (d < 60) return "#ffd85e";
  return "#ff4d6d";
}

function signalGlow(s) {
  if (s === SIGNAL_CYCLE.GREEN) return "#00e5a0";
  if (s === SIGNAL_CYCLE.YELLOW) return "#ffd85e";
  return "#ff4d6d";
}

function vehicleEmoji(type) {
  const map = { car: "🚗", truck: "🚛", bus: "🚌", two_wheeler: "🏍️", bicycle: "🚲" };
  return map[type] || "🚗";
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TrafficLight({ signal }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 6, background: "#0a0e1a", borderRadius: 12, padding: "10px 8px",
      border: "2px solid #1e2540", boxShadow: "0 0 20px #0003",
    }}>
      {[SIGNAL_CYCLE.RED, SIGNAL_CYCLE.YELLOW, SIGNAL_CYCLE.GREEN].map(c => (
        <div key={c} style={{
          width: 22, height: 22, borderRadius: "50%",
          background: signal === c ? signalGlow(c) : "#1e2540",
          boxShadow: signal === c ? `0 0 18px 6px ${signalGlow(c) + "88"}` : "none",
          transition: "all 0.4s ease",
        }} />
      ))}
    </div>
  );
}

function DensityBar({ density }) {
  return (
    <div style={{ width: "100%", background: "#0a0e1a", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${density}%`,
        background: `linear-gradient(90deg, #00e5a0, ${densityColor(density)})`,
        borderRadius: 8, transition: "width 0.6s ease",
        boxShadow: `0 0 8px ${densityColor(density) + "99"}`,
      }} />
    </div>
  );
}

function LaneCard({ lane, onAddVehicle, onHelmetCheck, helmetStatus }) {
  const isViolation = lane.violation;
  const twoWheelers = lane.vehicles.filter(v => v.type === VEHICLE_TYPES.TWO_WHEELER);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0d1229 0%, #0a0e1a 100%)",
      borderRadius: 20, padding: 22,
      border: `2px solid ${isViolation ? "#ff4d6d" : "#1e2540"}`,
      boxShadow: isViolation ? "0 0 30px #ff4d6d44" : "0 4px 30px #0005",
      transition: "all 0.4s ease", position: "relative", overflow: "hidden",
    }}>
      {isViolation && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 18,
          background: "radial-gradient(circle, #ff4d6d08 0%, transparent 70%)",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 15, color: "#e0e6ff", letterSpacing: 2 }}>
            {lane.name}
          </div>
          <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>{lane.direction}</div>
        </div>
        <TrafficLight signal={lane.signal} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 700,
          color: signalGlow(lane.signal), textShadow: `0 0 20px ${signalGlow(lane.signal)}`,
        }}>{String(lane.timer).padStart(2, "0")}s</div>
        <div style={{ fontSize: 11, color: "#556", textTransform: "uppercase", letterSpacing: 1 }}>
          {lane.signal} signal
        </div>
      </div>

      <div style={{ Benedict: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#667", textTransform: "uppercase", letterSpacing: 1 }}>Traffic Density</span>
          <span style={{ fontSize: 11, color: densityColor(lane.density), fontFamily: "monospace" }}>{lane.density}%</span>
        </div>
        <DensityBar density={lane.density} />
      </div>

      <div style={{
        background: "#060912", borderRadius: 12, padding: "10px 12px",
        minHeight: 52, marginBottom: 14, border: "1px solid #1e2540",
      }}>
        <div style={{ fontSize: 10, color: "#445", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Detected Vehicles ({lane.vehicles.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {lane.vehicles.slice(-10).map(v => (
            <div key={v.id} title={`${v.plate} | ${v.speed}km/h`} style={{
              background: v.type === VEHICLE_TYPES.TWO_WHEELER
                ? (v.hasHelmet === false ? "#ff4d6d22" : "#00e5a022")
                : "#1e2540",
              border: `1px solid ${v.type === VEHICLE_TYPES.TWO_WHEELER
                ? (v.hasHelmet === false ? "#ff4d6d66" : "#00e5a066")
                : "#2a3060"}`,
              borderRadius: 8, padding: "3px 7px", fontSize: 13,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {vehicleEmoji(v.type)}
              {v.type === VEHICLE_TYPES.TWO_WHEELER && (
                <span style={{ fontSize: 10 }}>{v.hasHelmet ? "🪖" : "❌"}</span>
              )}
            </div>
          ))}
          {lane.vehicles.length === 0 && (
            <span style={{ fontSize: 11, color: "#334" }}>No vehicles detected</span>
          )}
        </div>
      </div>

      {twoWheelers.length > 0 && helmetStatus[lane.id] && (
        <div style={{
          background: helmetStatus[lane.id] === HELMET_MESSAGES.missing ? "#ff4d6d11" : "#00e5a011",
          border: `1px solid ${helmetStatus[lane.id] === HELMET_MESSAGES.missing ? "#ff4d6d44" : "#00e5a044"}`,
          borderRadius: 10, padding: "8px 12px", marginBottom: 12,
          fontSize: 12, color: helmetStatus[lane.id] === HELMET_MESSAGES.missing ? "#ff8fa3" : "#00e5a0",
          fontFamily: "monospace",
        }}>
          {helmetStatus[lane.id]}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onAddVehicle(lane.id)} style={{
          flex: 1, background: "linear-gradient(135deg, #1e2d80, #1a2360)",
          border: "1px solid #3040a0", borderRadius: 10, color: "#8899ff",
          fontSize: 11, padding: "8px 0", cursor: "pointer", letterSpacing: 1,
          fontFamily: "'Orbitron', monospace", transition: "all 0.2s",
        }}>+ ADD VEHICLE</button>
        <button onClick={() => onHelmetCheck(lane.id)} style={{
          flex: 1, background: "linear-gradient(135deg, #1a2e1a, #0e1e10)",
          border: "1px solid #2a602a", borderRadius: 10, color: "#66cc66",
          fontSize: 11, padding: "8px 0", cursor: "pointer", letterSpacing: 1,
          fontFamily: "'Orbitron', monospace", transition: "all 0.2s",
        }}>🪖 AI SCAN</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{
      background: "#0d1229", borderRadius: 14, padding: "16px 20px",
      border: "1px solid #1e2540", textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: "#556", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 700, color: color || "#8899ff" }}>
        {value}<span style={{ fontSize: 13, color: "#556", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function ViolationLog({ log }) {
  return (
    <div style={{
      background: "#0a0e1a", borderRadius: 16, padding: 20,
      border: "1px solid #ff4d6d33", maxHeight: 220, overflowY: "auto",
    }}>
      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#ff4d6d", letterSpacing: 2, marginBottom: 14 }}>
        ⚠ VIOLATION LOG
      </div>
      {log.length === 0 && <div style={{ fontSize: 12, color: "#334" }}>No violations recorded.</div>}
      {log.slice().reverse().map((entry, i) => (
        <div key={i} style={{
          borderBottom: "1px solid #1e2540", paddingBottom: 8, marginBottom: 8,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <span style={{ fontSize: 12, color: "#ff8fa3", fontFamily: "monospace" }}>{entry.plate}</span>
            <span style={{ fontSize: 11, color: "#556", marginLeft: 8 }}>{entry.lane}</span>
          </div>
          <div style={{ fontSize: 10, color: "#ff4d6d", background: "#ff4d6d11", padding: "3px 8px", borderRadius: 6 }}>
            NO HELMET
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function SmartTrafficSystem() {
  const [lanes, setLanes] = useState(INITIAL_LANES);
  const [helmetStatus, setHelmetStatus] = useState({});
  const [violationLog, setViolationLog] = useState([]);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [aiActivity, setAiActivity] = useState("");
  const [systemTime, setSystemTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // AI Activity log
  useEffect(() => {
    const msgs = [
      "🤖 Neural net scanning intersections...",
      "📡 LIDAR depth map updating...",
      "🔍 Plate recognition active...",
      "🧠 Density prediction model running...",
      "🪖 Helmet classifier inference...",
      "📊 Traffic flow optimization...",
      "🛰 GPS sync with city network...",
    ];
    const t = setInterval(() => setAiActivity(randomItem(msgs)), 2500);
    return () => clearInterval(t);
  }, []);

  // Signal rotation + timer countdown
  useEffect(() => {
    const tick = setInterval(() => {
      setLanes(prev => {
        const next = prev.map(l => ({
          ...l,
          timer: l.timer > 1 ? l.timer - 1 : 30,
        }));
        const greenIdx = next.findIndex(l => l.signal === SIGNAL_CYCLE.GREEN);
        const switchingLane = next[greenIdx];
        if (switchingLane.timer === 1) {
          const nextGreen = (greenIdx + 1) % next.length;
          return next.map((l, i) => ({
            ...l,
            signal: i === nextGreen ? SIGNAL_CYCLE.GREEN
              : i === greenIdx ? SIGNAL_CYCLE.RED
              : l.signal,
          }));
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // FIXED STEP 2 Logic: Core functionality rewritten clearly without loop nesting bugs
  const addVehicleToLane = useCallback((laneId, auto = false) => {
    const vehicle = generateVehicle(); 

    setLanes(prev => prev.map(l => {
      if (l.id !== laneId) return l;
      const newVehicles = [...l.vehicles, vehicle].slice(-15);
      const density = Math.min(100, newVehicles.length * 7 + randomBetween(0, 10));
      const hasUnhelmetedRider = newVehicles.some(v => v.type === VEHICLE_TYPES.TWO_WHEELER && v.hasHelmet === false);
      return {
        ...l,
        vehicles: newVehicles,
        density,
        violation: hasUnhelmetedRider,
        signal: hasUnhelmetedRider && l.signal !== SIGNAL_CYCLE.GREEN
          ? SIGNAL_CYCLE.RED
          : l.signal,
      };
    }));

    setTotalVehicles(t => t + 1);

    if (vehicle.type === VEHICLE_TYPES.TWO_WHEELER && vehicle.hasHelmet === false) {
      setTotalViolations(v => v + 1);
      setViolationLog(log => [...log, {
        plate: vehicle.plate,
        lane: `Lane ${laneId === 1 ? "A" : laneId === 2 ? "B" : laneId === 3 ? "C" : "D"}`,
        time: new Date().toLocaleTimeString(),
      }].slice(-50));
    }
  }, []);

  // FIXED: Removed the dependency loop bug from auto-spawn
  useEffect(() => {
    const spawn = setInterval(() => {
      const laneId = randomBetween(1, 4);
      addVehicleToLane(laneId, true);
    }, 2500);
    return () => clearInterval(spawn);
  }, [addVehicleToLane]);

  const handleAddVehicle = (laneId) => addVehicleToLane(laneId, false);

  const handleHelmetCheck = async (laneId) => {
    setHelmetStatus(s => ({ ...s, [laneId]: HELMET_MESSAGES.checking }));
    await new Promise(r => setTimeout(r, 1200));

    setLanes(prev => {
      const lane = prev.find(l => l.id === laneId);
      const riders = lane.vehicles.filter(v => v.type === VEHICLE_TYPES.TWO_WHEELER);
      if (riders.length === 0) {
        setHelmetStatus(s => ({ ...s, [laneId]: "ℹ️ No two-wheelers in lane" }));
        return prev;
      }
      const violators = riders.filter(v => v.hasHelmet === false);
      if (violators.length > 0) {
        setHelmetStatus(s => ({ ...s, [laneId]: HELMET_MESSAGES.missing }));
        return prev.map(l => l.id === laneId
          ? { ...l, violation: true, signal: SIGNAL_CYCLE.RED }
          : l
        );
      } else {
        setHelmetStatus(s => ({ ...s, [laneId]: HELMET_MESSAGES.detected }));
        return prev.map(l => l.id === laneId
          ? { ...l, violation: false }
          : l
        );
      }
    });
  };

  const avgDensity = Math.round(lanes.reduce((a, l) => a + l.density, 0) / 4);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060912; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1e2540; border-radius: 3px; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#060912",
        fontFamily: "'Share Tech Mono', monospace", color: "#c0ccff",
        padding: "0 0 40px",
      }}>
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #00e5a022, transparent)",
          animation: "scanline 8s linear infinite", pointerEvents: "none", zIndex: 999,
        }} />

        <div style={{
          background: "linear-gradient(180deg, #0d1229 0%, #060912 100%)",
          borderBottom: "1px solid #1e2540", padding: "20px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, zIndex: 100,
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #00e5a0, #0080ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 0 20px #00e5a044",
            }}>🚦</div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, letterSpacing: 3, color: "#fff" }}>
                NEXUS<span style={{ color: "#00e5a0" }}>TRAFFIC</span>
              </div>
              <div style={{ fontSize: 10, color: "#445", letterSpacing: 2 }}>
                AI-POWERED SMART INTERSECTION CONTROL v3.1
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 20, color: "#00e5a0",
              textShadow: "0 0 15px #00e5a0",
            }}>
              {systemTime.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 10, color: "#445", marginTop: 2, letterSpacing: 1 }}>
              {aiActivity || "🤖 System active"}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            <StatCard label="Total Detected" value={totalVehicles} unit="veh" color="#8899ff" />
            <StatCard label="Avg Density" value={avgDensity} unit="%" color={densityColor(avgDensity)} />
            <StatCard label="Helmet Violations" value={totalViolations} unit="" color="#ff4d6d" />
            <StatCard label="Active Lanes" value={lanes.filter(l => l.signal === SIGNAL_CYCLE.GREEN).length} unit="/ 4" color="#00e5a0" />
          </div>

          {lanes.some(l => l.violation) && (
            <div style={{
              background: "linear-gradient(90deg, #ff4d6d11, #ff4d6d08, #ff4d6d11)",
              border: "1px solid #ff4d6d66", borderRadius: 14, padding: "14px 22px",
              marginBottom: 24, display: "flex", alignItems: "center", gap: 12,
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, color: "#ff4d6d", letterSpacing: 2 }}>
                  HELMET VIOLATION DETECTED
                </div>
                <div style={{ fontSize: 11, color: "#ff8fa3", marginTop: 3 }}>
                  AI has identified two-wheeler riders without helmets. Signal held RED until compliance.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 28 }}>
            {lanes.map(lane => (
              <LaneCard
                key={lane.id}
                lane={lane}
                onAddVehicle={handleAddVehicle}
                onHelmetCheck={handleHelmetCheck}
                helmetStatus={helmetStatus}
              />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{
              background: "#0d1229", borderRadius: 16, padding: 22,
              border: "1px solid #1e2540",
            }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#00e5a0", letterSpacing: 2, marginBottom: 16 }}>
                🧠 AI HELMET DETECTION LOGIC
              </div>
              {[
                { icon: "📷", label: "Input", desc: "Real-time camera frames from each lane" },
                { icon: "🧠", label: "CNN Model", desc: "ResNet-50 backbone classifies helmet / no-helmet on riders" },
                { icon: "🪖", label: "No Helmet", desc: "Signal overridden to RED — lane blocked" },
                { icon: "✅", label: "Helmet OK", desc: "Normal signal cycle resumes" },
                { icon: "📋", label: "Logging", desc: "Plate + violation timestamped for authorities" },
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: "#060912",
                    border: "1px solid #1e2540", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}> {s.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, color: "#8899ff", fontFamily: "\'Orbitron\', monospace", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "#556", marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <ViolationLog log={violationLog} />
          </div>

          <div style={{
            marginTop: 28, textAlign: "center",
            fontSize: 10, color: "#334", letterSpacing: 2,
          }}>
            NEXUSTRAFFIC AI SYSTEM · ADAPTIVE SIGNAL CONTROL · HELMET ENFORCEMENT MODULE · v3.1
          </div>
        </div>
      </div>
    </>
  );
}