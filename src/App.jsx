import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import {
  BatteryCharging, Bot, CheckCircle2, ChevronRight, CloudLightning,
  Droplets, Factory, FlaskConical, Leaf, Radio, Shield, Sun, Users,
  Wind, XCircle, Zap
} from "lucide-react";

const PLANETS = {
  Moon: {
    icon: "🌕",
    color: "#d7dce4",
    ground: "#777d88",
    description: "Learn the basics of power, life support and radiation protection.",
    challenge: "Long lunar night",
    missionDays: 12
  },
  Mars: {
    icon: "🔴",
    color: "#b65b3d",
    ground: "#9b4c36",
    description: "Handle dust storms, power limits and communication delay.",
    challenge: "Dust storm",
    missionDays: 12
  }
};

const INITIAL = {
  oxygen: 90,
  power: 85,
  food: 80,
  water: 78,
  shielding: 72,
  health: 92,
  science: 0
};

const BUILDINGS = {
  "Crew Habitat": { icon: Users, color: "#dfe7f2", cost: { power: 2 }, info: "Keeps the crew protected and supports life support." },
  Greenhouse: { icon: Leaf, color: "#48b77e", cost: { power: 5, water: 4 }, info: "Produces food, but needs electricity and water." },
  "Research Lab": { icon: FlaskConical, color: "#d8ad4f", cost: { power: 7 }, info: "Runs experiments and increases science score." },
  "Radiation Shelter": { icon: Shield, color: "#9b9eea", cost: { power: 3 }, info: "Reduces radiation exposure during solar events." },
  "Solar Power Station": { icon: Sun, color: "#3b86bd", cost: {}, info: "Generates power during normal sunlight conditions." },
  "Communication Tower": { icon: Radio, color: "#e5e5e5", cost: { power: 2 }, info: "Maintains contact with Earth; Mars has a simulated delay." }
};

const EVENTS = {
  Moon: [
    { title: "Solar activity alert", text: "A radiation event is approaching. Protecting the crew uses power, but ignoring it can reduce health.", choices: [
      { label: "Use radiation shelter", effects: { power: -8, health: 2, shielding: 3 }, result: "Crew sheltered safely. The shelter consumed extra power." },
      { label: "Continue research", effects: { health: -12, science: 8 }, result: "Research continued, but the crew received extra radiation exposure." }
    ]},
    { title: "Lunar night planning", text: "The long lunar night is coming. Save energy now or keep the greenhouse running.", choices: [
      { label: "Save power", effects: { power: 10, food: -5 }, result: "You conserved energy, but food production slowed." },
      { label: "Keep greenhouse active", effects: { power: -10, food: 10 }, result: "Food production stayed strong at the cost of stored power." }
    ]},
    { title: "Equipment check", text: "A life-support filter needs attention.", choices: [
      { label: "Repair immediately", effects: { power: -6, oxygen: 5 }, result: "The filter was repaired and oxygen efficiency improved." },
      { label: "Delay repair", effects: { oxygen: -12, science: 4 }, result: "The crew gained time for science, but oxygen reserves fell." }
    ]}
  ],
  Mars: [
    { title: "Dust storm warning", text: "A regional dust storm is reducing solar generation.", choices: [
      { label: "Enter shelter mode", effects: { power: -3, shielding: 2, health: 2 }, result: "The crew reduced outdoor exposure and protected systems." },
      { label: "Keep operations running", effects: { power: -14, science: 6 }, result: "You kept working, but solar power reserves dropped sharply." }
    ]},
    { title: "Earth communication delay", text: "A message from Earth will take time to arrive. Decide without immediate guidance.", choices: [
      { label: "Make the local decision", effects: { science: 7, health: -2 }, result: "The crew acted independently and completed the task." },
      { label: "Wait for Earth", effects: { power: -4, food: -4 }, result: "Waiting preserved certainty but consumed resources." }
    ]},
    { title: "Greenhouse maintenance", text: "Dust has reduced the greenhouse's efficiency.", choices: [
      { label: "Clean it now", effects: { power: -5, food: 12 }, result: "The greenhouse recovered and produced more food." },
      { label: "Postpone it", effects: { food: -10, power: 4 }, result: "You saved power now, but future food production fell." }
    ]}
  ]
};

function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

function Clickable({ name, position, onClick, children }) {
  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(name); }}>
      {children}
    </group>
  );
}

function Platform({ selected, radius = 1.1 }) {
  return (
    <>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[radius, radius * 1.04, 0.14, 32]} />
        <meshStandardMaterial color={selected ? "#dcecff" : "#3d4654"} metalness={0.35} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[radius * 0.82, radius * 0.82, 0.04, 32]} />
        <meshStandardMaterial color="#171f2b" roughness={0.9} />
      </mesh>
    </>
  );
}

function HabitatModel() {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.62, 0.62, 1.55, 24]} />
        <meshStandardMaterial color="#e4e9ef" metalness={0.18} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.63, 0.035, 8, 24]} />
        <meshStandardMaterial color="#607087" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#b9d5e7" metalness={0.05} roughness={0.28} />
      </mesh>
      <mesh position={[0.58, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.18, 20]} />
        <meshStandardMaterial color="#4c5b6d" />
      </mesh>
      {[-0.48, 0, 0.48].map((z) => (
        <mesh key={z} position={[0, 0.62, z]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.32, 0.045, 0.24]} />
          <meshStandardMaterial color="#62bfe7" emissive="#143d52" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.38, 10]} />
        <meshStandardMaterial color="#c7d0da" metalness={0.65} />
      </mesh>
      <mesh position={[0, 1.76, 0]}>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshStandardMaterial color="#ffcf5a" emissive="#7b5510" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function GreenhouseModel() {
  const ribs = [-0.72, -0.36, 0, 0.36, 0.72];
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 0.08, 1.15]} />
        <meshStandardMaterial color="#344252" metalness={0.45} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[1.55, 0.65, 1.0]} />
        <meshStandardMaterial color="#8de7c1" transparent opacity={0.32} roughness={0.12} metalness={0.05} />
      </mesh>
      {ribs.map((x) => (
        <mesh key={x} position={[x, 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.5, 0.025, 6, 18, Math.PI]} />
          <meshStandardMaterial color="#9aa8b8" metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {[-0.42, 0, 0.42].map((x) => (
        <group key={x} position={[x, 0.72, 0]}>
          <mesh position={[0, 0.13, 0]}><cylinderGeometry args={[0.11, 0.14, 0.25, 8]} /><meshStandardMaterial color="#244c3b" /></mesh>
          <mesh position={[0, 0.32, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#52c788" /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.45, 0]}><boxGeometry args={[0.12, 0.08, 0.12]} /><meshStandardMaterial color="#f1d06a" emissive="#6d4f12" emissiveIntensity={0.5} /></mesh>
    </group>
  );
}

function ResearchLabModel() {
  return (
    <group>
      <mesh position={[0, 0.64, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.65, 0.65, 1.25, 24]} />
        <meshStandardMaterial color="#c79b38" metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.38, 0.48, 0.32, 16]} />
        <meshStandardMaterial color="#d9e9f2" metalness={0.1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.3, 18, 12]} />
        <meshStandardMaterial color="#8ed7ef" transparent opacity={0.72} roughness={0.18} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.025, 6, 18]} />
        <meshStandardMaterial color="#eff7ff" metalness={0.5} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.58, 0.66]}>
          <boxGeometry args={[0.24, 0.24, 0.04]} />
          <meshStandardMaterial color="#71d0ff" emissive="#163f50" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0.7, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.18, 16]} />
        <meshStandardMaterial color="#65788c" />
      </mesh>
    </group>
  );
}

function ShelterModel() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.65, 0.48, 1.3]} />
        <meshStandardMaterial color="#8b91d8" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.65, 0.65, 1.65, 20, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#a6a9e9" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.45, 0.69]}>
        <boxGeometry args={[0.5, 0.58, 0.08]} />
        <meshStandardMaterial color="#303747" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, 0.74]}>
        <boxGeometry args={[0.12, 0.16, 0.03]} />
        <meshStandardMaterial color="#ffcc62" emissive="#6b4510" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.72, 0.25, -0.42]}>
        <boxGeometry args={[0.22, 0.2, 0.22]} />
        <meshStandardMaterial color="#596273" />
      </mesh>
    </group>
  );
}

function CommunicationModel() {
  return (
    <group>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 2.15, 12]} />
        <meshStandardMaterial color="#aeb9c6" metalness={0.75} roughness={0.3} />
      </mesh>
      {[0.42, 0.95, 1.48].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.9, 0.035, 0.035]} />
          <meshStandardMaterial color="#6e7b8c" metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[0.05, 2.1, 0]} rotation={[0.15, 0, -0.2]}>
        <sphereGeometry args={[0.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d8dde4" roughness={0.42} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
        <meshStandardMaterial color="#c8d0da" />
      </mesh>
      <mesh position={[0.25, 1.55, 0]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshStandardMaterial color="#62e2a4" emissive="#184d35" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Building({ name, position, color, onClick, selected }) {
  const models = {
    "Crew Habitat": HabitatModel,
    Greenhouse: GreenhouseModel,
    "Research Lab": ResearchLabModel,
    "Radiation Shelter": ShelterModel,
    "Communication Tower": CommunicationModel
  };
  const Model = models[name];
  return (
    <Clickable name={name} position={position} onClick={onClick}>
      <Platform selected={selected} radius={name === "Communication Tower" ? 0.82 : 1.08} />
      <Model />
      <Text position={[0, name === "Communication Tower" ? 2.55 : 1.95, 0]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle">
        {name}
      </Text>
      {selected && <pointLight position={[0, 1.1, 0]} intensity={1.5} distance={3} color={color} />}
    </Clickable>
  );
}

function SolarPanel({ position, onClick }) {
  return (
    <Clickable name="Solar Power Station" position={position} onClick={onClick}>
      <Platform radius={1.0} />
      <group rotation={[0.08, 0.18, 0]}>
        {[0, 1.05, 2.1].map((x) => (
          <group key={x} position={[x - 1.05, 0.72, 0]}>
            <mesh>
              <boxGeometry args={[0.92, 0.07, 1.2]} />
              <meshStandardMaterial color="#155a92" metalness={0.62} roughness={0.3} />
            </mesh>
            {[0.23, -0.23].map((z) => (
              <mesh key={z} position={[0, 0.041, z]}>
                <boxGeometry args={[0.82, 0.01, 0.035]} />
                <meshStandardMaterial color="#8ccff2" emissive="#123f58" emissiveIntensity={0.45} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.72, 12]} />
          <meshStandardMaterial color="#b8c2ce" metalness={0.7} />
        </mesh>
      </group>
      <Text position={[0, 1.55, 0]} fontSize={0.17} color="#ffffff" anchorX="center">SOLAR ARRAY</Text>
    </Clickable>
  );
}

function Rover({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.05, 0.3, 0.72]} />
        <meshStandardMaterial color="#d9e0e7" metalness={0.25} roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.48]} />
        <meshStandardMaterial color="#f0f3f6" roughness={0.45} />
      </mesh>
      {[[-0.42, 0.26, 0.34], [0.42, 0.26, 0.34], [-0.42, 0.26, -0.34], [0.42, 0.26, -0.34]].map(([x, y, z], i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[x, y, z]}>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 18]} />
          <meshStandardMaterial color="#202630" roughness={0.92} />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.58, 10]} />
        <meshStandardMaterial color="#adb8c5" metalness={0.65} />
      </mesh>
      <mesh position={[0, 1.28, 0]}>
        <boxGeometry args={[0.22, 0.14, 0.18]} />
        <meshStandardMaterial color="#4d5968" />
      </mesh>
      <mesh position={[0, 0.62, -0.02]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.62, 0.035, 0.42]} />
        <meshStandardMaterial color="#1d628f" metalness={0.6} roughness={0.32} />
      </mesh>
    </group>
  );
}

function Astronaut({ position, color = "#f4f4f4" }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.66, 0]}>
        <capsuleGeometry args={[0.17, 0.28, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.58} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshStandardMaterial color="#f5f7fa" roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.02, 0.16]}>
        <sphereGeometry args={[0.135, 16, 12]} />
        <meshStandardMaterial color="#20384c" metalness={0.1} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.68, -0.19]}>
        <boxGeometry args={[0.26, 0.32, 0.12]} />
        <meshStandardMaterial color="#b8c1cc" roughness={0.7} />
      </mesh>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.66, 0]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}>
          <capsuleGeometry args={[0.055, 0.22, 6, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]}>
          <capsuleGeometry args={[0.065, 0.24, 6, 10]} />
          <meshStandardMaterial color="#cbd3dc" />
        </mesh>
      ))}
    </group>
  );
}

function OutpostScene({ planet, selected, onSelect }) {
  const p = PLANETS[planet];
  return (
    <>
      <color attach="background" args={["#07111f"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[7, 10, 5]} intensity={2.1} />
      <Stars radius={90} depth={45} count={1800} factor={2.5} fade />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color={p.ground} roughness={1} />
      </mesh>
      <Building name="Crew Habitat" position={[-2.4, 0, -0.3]} color={BUILDINGS["Crew Habitat"].color} selected={selected === "Crew Habitat"} onClick={onSelect} />
      <Building name="Greenhouse" position={[2.1, 0, -1.1]} color={BUILDINGS.Greenhouse.color} selected={selected === "Greenhouse"} onClick={onSelect} />
      <Building name="Research Lab" position={[0.2, 0, 2.2]} color={BUILDINGS["Research Lab"].color} selected={selected === "Research Lab"} onClick={onSelect} />
      <Building name="Radiation Shelter" position={[-3.5, 0, 2.5]} color={BUILDINGS["Radiation Shelter"].color} selected={selected === "Radiation Shelter"} onClick={onSelect} />
      <SolarPanel position={[3.8, 0, 2.8]} onClick={onSelect} />
      <Building name="Communication Tower" position={[4.1, 0, -3.0]} color={BUILDINGS["Communication Tower"].color} selected={selected === "Communication Tower"} onClick={onSelect} />
      <Rover position={[0, 0, -3.5]} />
      <Astronaut position={[-1.1, 0, 1.2]} />
      <Astronaut position={[1.0, 0, 0.4]} color="#dbe7ff" />
      <OrbitControls makeDefault minDistance={7} maxDistance={20} maxPolarAngle={Math.PI / 2.08} target={[0, 0, 0]} />
    </>
  );
}

function Resource({ label, value, icon: Icon }) {
  return (
    <div className="resource">
      <div className="resource-head"><span><Icon size={15} /> {label}</span><strong>{value}%</strong></div>
      <div className="bar"><div style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export default function App() {
  const [planet, setPlanet] = useState("Moon");
  const [started, setStarted] = useState(false);
  const [day, setDay] = useState(1);
  const [resources, setResources] = useState(INITIAL);
  const [selected, setSelected] = useState("");
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState("Choose a mission and become the commander of an outpost.");
  const [built, setBuilt] = useState(["Crew Habitat", "Greenhouse", "Solar Power Station", "Communication Tower"]);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);

  const currentPlanet = PLANETS[planet];
  function startMission(nextPlanet = planet) {
    setPlanet(nextPlanet);
    setStarted(true);
    setDay(1);
    setResources(INITIAL);
    setBuilt(["Crew Habitat", "Greenhouse", "Solar Power Station", "Communication Tower"]);
    setSelected("");
    setEvent(null);
    setGameOver(false);
    setVictory(false);
    setMessage(`Mission started on ${nextPlanet}. Keep the crew safe for ${PLANETS[nextPlanet].missionDays} days.`);
  }

  function updateEffects(effects) {
    setResources(prev => {
      const next = { ...prev };
      Object.entries(effects).forEach(([key, amount]) => {
        next[key] = clamp((next[key] ?? 0) + amount);
      });
      return next;
    });
  }

  function chooseEvent(choice) {
    updateEffects(choice.effects);
    setMessage(choice.result);
    setEvent(null);
  }

  function advanceDay() {
    if (gameOver || victory) return;
    const baseDrain = { oxygen: -5, power: -4, food: -3, water: -3 };
    if (planet === "Mars" && day % 4 === 0) baseDrain.power -= 3;
    if (built.includes("Greenhouse")) baseDrain.food += 2;
    if (built.includes("Solar Power Station")) baseDrain.power += 5;
    if (built.includes("Crew Habitat")) baseDrain.oxygen += 1;

    updateEffects(baseDrain);

    const nextDay = day + 1;
    if (nextDay > currentPlanet.missionDays) {
      setVictory(true);
      setMessage("Mission complete! Your crew survived the training mission.");
      return;
    }
    setDay(nextDay);
    setSelected("");
    const pool = EVENTS[planet];
    setEvent(pool[(nextDay - 1) % pool.length]);
  }

  function interactBuilding(name) {
    setSelected(name);
    if (name === "Solar Power Station") {
      updateEffects({ power: 12 });
      setMessage("Solar station generated stored power.");
    } else if (name === "Greenhouse") {
      updateEffects({ food: 8, water: -4, power: -3 });
      setMessage("The greenhouse produced food, using water and power.");
    } else if (name === "Research Lab") {
      updateEffects({ science: 8, power: -6 });
      setMessage("Science experiment completed: +8 science, -6 power.");
    } else if (name === "Radiation Shelter") {
      updateEffects({ shielding: 5, power: -3 });
      setMessage("Shielding systems checked and reinforced.");
    } else if (name === "Communication Tower") {
      updateEffects({ power: -2 });
      setMessage(planet === "Mars" ? "Message sent to Earth. Mars communication has a delay." : "Communication link with Earth is healthy.");
    }
  }

  function build(name) {
    if (built.includes(name)) {
      setMessage(`${name} is already part of your outpost.`);
      return;
    }
    const cost = BUILDINGS[name].cost;
    const canBuild = Object.entries(cost).every(([k, v]) => (resources[k] ?? 0) >= v);
    if (!canBuild) {
      setMessage(`Not enough resources to build ${name}.`);
      return;
    }
    updateEffects(Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, -v])));
    setBuilt(prev => [...prev, name]);
    setMessage(`${name} constructed. Every new system has an operating cost.`);
  }

  function reset() {
    setStarted(false);
    setGameOver(false);
    setVictory(false);
    setEvent(null);
    setMessage("Choose Moon or Mars to begin.");
  }

  const critical = Object.values({
    oxygen: resources.oxygen,
    power: resources.power,
    food: resources.food,
    water: resources.water,
    health: resources.health
  }).some(v => v <= 0);

  useEffect(() => {
    if (critical && started && !gameOver && !victory) {
      setGameOver(true);
    }
  }, [critical, started, gameOver, victory]);

  if (!started) {
    return (
      <div className="landing">
        <div className="landing-glow" />
        <div className="landing-card">
          <div className="eyebrow">NASA SPACE APPS • EDUCATIONAL SIMULATION</div>
          <h1>🚀 Junior Astronaut<br /><span>Mission Trainer</span></h1>
          <p>Run a lunar or Martian outpost. Balance life support, power, food, water and radiation protection. Every choice has a cost.</p>
          <div className="planet-select">
            {Object.entries(PLANETS).map(([name, data]) => (
              <button key={name} className={`planet-card ${planet === name ? "selected" : ""}`} onClick={() => setPlanet(name)}>
                <span className="planet-icon">{data.icon}</span>
                <span><b>{name}</b><small>{data.description}</small></span>
              </button>
            ))}
          </div>
          <button className="primary start" onClick={() => startMission(planet)}>Start Mission <ChevronRight /></button>
          <p className="disclaimer">Prototype values are simplified educational game mechanics. NASA data integrations are planned for the next development phase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><div className="logo">🚀</div><div><b>Junior Astronaut</b><small>MISSION TRAINER</small></div></div>
        <div className="mission-pill">{currentPlanet.icon} {planet} OUTPOST <span>DAY {day}/{currentPlanet.missionDays}</span></div>
        <button className="ghost" onClick={reset}>Exit Mission</button>
      </header>

      <main className="game-grid">
        <section className="scene-card">
          <div className="scene-toolbar">
            <span>OUTPOST VIEW</span><span>Drag to rotate • Scroll to zoom • Click systems</span>
          </div>
          <div className="scene">
            <Canvas camera={{ position: [9, 8, 10], fov: 43 }}>
              <OutpostScene planet={planet} selected={selected} onSelect={interactBuilding} />
            </Canvas>
          </div>
          <div className="event-strip"><CloudLightning size={17} /><span>{message}</span></div>
        </section>

        <aside className="control-panel">
          <div className="panel-title"><span>MISSION CONTROL</span><span className="live">● LIVE</span></div>
          <div className="crew"><Users size={18} /><div><b>2 astronauts</b><small>Crew health {resources.health}%</small></div><div className="health-dot" /></div>

          <Resource label="Oxygen" value={resources.oxygen} icon={Wind} />
          <Resource label="Power" value={resources.power} icon={BatteryCharging} />
          <Resource label="Food" value={resources.food} icon={Leaf} />
          <Resource label="Water" value={resources.water} icon={Droplets} />
          <Resource label="Shielding" value={resources.shielding} icon={Shield} />

          <div className="science"><FlaskConical size={16} /><span>Science score</span><b>{resources.science}</b></div>

          <div className="selected-box">
            <div className="selected-title"><Factory size={17} /> Outpost systems</div>
            <div className="system-list">
              {Object.keys(BUILDINGS).map(name => {
                const Icon = BUILDINGS[name].icon;
                return (
                  <button key={name} className={built.includes(name) ? "system built" : "system"} onClick={() => built.includes(name) ? interactBuilding(name) : build(name)}>
                    <Icon size={15} /><span>{name}</span>{built.includes(name) ? <CheckCircle2 size={14} /> : <span className="build">BUILD</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button className="primary next" onClick={advanceDay}>End Day & Continue <ChevronRight /></button>
          <div className="source-note">NASA data note: this prototype uses simplified mechanics. Real DONKI, OSDR/RadLab and planetary data should be connected and attributed before submission.</div>
        </aside>
      </main>

      {event && (
        <div className="modal-backdrop">
          <div className="event-modal">
            <button className="close" onClick={() => setEvent(null)}><XCircle /></button>
            <div className="event-icon"><CloudLightning /></div>
            <div className="eyebrow">MISSION EVENT • DAY {day}</div>
            <h2>{event.title}</h2>
            <p>{event.text}</p>
            <div className="choices">
              {event.choices.map((choice, i) => (
                <button key={i} onClick={() => chooseEvent(choice)} className="choice">
                  <b>{choice.label}</b><small>Make this decision</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {victory && (
        <div className="modal-backdrop">
          <div className="result-modal success">
            <CheckCircle2 size={52} />
            <div className="eyebrow">MISSION COMPLETE</div>
            <h2>Outstanding, Commander!</h2>
            <p>Your crew completed the {planet} training mission.</p>
            <div className="result-grid">
              <div><b>{resources.health}%</b><small>Crew health</small></div>
              <div><b>{resources.science}</b><small>Science</small></div>
              <div><b>{resources.power}%</b><small>Power left</small></div>
            </div>
            <button className="primary" onClick={() => startMission(planet)}>Play Again</button>
          </div>
        </div>
      )}

      {gameOver && !victory && (
        <div className="modal-backdrop">
          <div className="result-modal failure">
            <XCircle size={52} />
            <div className="eyebrow">MISSION ENDED</div>
            <h2>Mission needs a new plan.</h2>
            <p>A critical resource reached zero. Try a different strategy—the point is to learn from the trade-offs.</p>
            <button className="primary" onClick={() => startMission(planet)}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}