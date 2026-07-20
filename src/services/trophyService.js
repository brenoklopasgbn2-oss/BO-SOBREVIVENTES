import { prisma } from '../db/prisma.js';

const MAX_EVENTS_PER_PLAYER = 20000;

function metricTrophy({ metric, target, unit, ...rule }) {
  return {
    ...rule,
    achieved: (s) => safeNumber(s[metric]) >= target,
    progress: (s) => {
      const raw = safeNumber(s[metric]);
      const value = metric === 'longestKill' ? Math.round(raw) : Math.floor(raw);
      return { value, target, label: `${value}/${target} ${unit}` };
    }
  };
}

function pairedProgress(valueA, targetA, valueB, targetB, label) {
  const percentA = Math.min(1, safeNumber(valueA) / Math.max(1, safeNumber(targetA)));
  const percentB = Math.min(1, safeNumber(valueB) / Math.max(1, safeNumber(targetB)));
  return { value: Math.round(((percentA + percentB) / 2) * 100), target: 100, label };
}

function multiProgress(requirements = [], label = '') {
  const completed = requirements.reduce((sum, [value, target]) => {
    return sum + Math.min(1, safeNumber(value) / Math.max(1, safeNumber(target)));
  }, 0);
  const divisor = Math.max(1, requirements.length);
  return { value: Math.round((completed / divisor) * 100), target: 100, label };
}

export const AUTOMATIC_TROPHY_CATALOG = [
  metricTrophy({
    key: "FIRST_BLOOD",
    title: "Primeiro Sangue",
    shortTitle: "Primeiro Sangue",
    description: "Registre sua primeira eliminação no RAID-Z.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/first-blood.svg",
    color: "#ef4444",
    points: 40,
    tier: 1,
    rarity: "Comum",
    badgeText: "1",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "1 kill",
    metric: "kills",
    target: 1,
    unit: "kill"
  }),
  metricTrophy({
    key: "HUNTER_BRONZE",
    title: "Caçador de Bronze",
    shortTitle: "Caçador I",
    description: "Alcance 10 eliminações registradas.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/hunter-bronze.svg",
    color: "#cd7f32",
    points: 100,
    tier: 1,
    rarity: "Bronze",
    badgeText: "10",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "10 kills",
    metric: "kills",
    target: 10,
    unit: "kills"
  }),
  metricTrophy({
    key: "HUNTER_SILVER",
    title: "Caçador de Prata",
    shortTitle: "Caçador II",
    description: "Alcance 50 eliminações registradas.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/hunter-silver.svg",
    color: "#cbd5e1",
    points: 250,
    tier: 2,
    rarity: "Prata",
    badgeText: "50",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "50 kills",
    metric: "kills",
    target: 50,
    unit: "kills"
  }),
  metricTrophy({
    key: "HUNTER_GOLD",
    title: "Caçador de Ouro",
    shortTitle: "Caçador III",
    description: "Alcance 100 eliminações registradas.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/hunter-gold.svg",
    color: "#f7bd44",
    points: 500,
    tier: 3,
    rarity: "Ouro",
    badgeText: "100",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "100 kills",
    metric: "kills",
    target: 100,
    unit: "kills"
  }),
  metricTrophy({
    key: "REAPER",
    title: "Ceifador",
    shortTitle: "Ceifador",
    description: "Conquiste 250 eliminações no servidor.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/reaper.svg",
    color: "#ef4444",
    points: 1000,
    tier: 4,
    rarity: "Rubi",
    badgeText: "250",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "250 kills",
    metric: "kills",
    target: 250,
    unit: "kills"
  }),
  metricTrophy({
    key: "WAR_LEGEND",
    title: "Lenda de Guerra",
    shortTitle: "Lenda",
    description: "A marca de 500 eliminações transforma o player em lenda.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/war-legend.svg",
    color: "#fb7185",
    points: 1800,
    tier: 5,
    rarity: "Rubi",
    badgeText: "500",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "500 kills",
    metric: "kills",
    target: 500,
    unit: "kills"
  }),
  metricTrophy({
    key: "WARLORD",
    title: "Senhor da Guerra",
    shortTitle: "Warlord",
    description: "Alcance 750 eliminações registradas.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/warlord.svg",
    color: "#f97316",
    points: 2400,
    tier: 6,
    rarity: "Lendário",
    badgeText: "750",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "750 kills",
    metric: "kills",
    target: 750,
    unit: "kills"
  }),
  metricTrophy({
    key: "APOCALYPSE",
    title: "Apocalipse",
    shortTitle: "Apocalipse",
    description: "Chegue a 1.000 eliminações no RAID-Z.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/apocalypse.svg",
    color: "#dc2626",
    points: 3200,
    tier: 7,
    rarity: "Obsidiana",
    badgeText: "1K",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "1.000 kills",
    metric: "kills",
    target: 1000,
    unit: "kills"
  }),
  metricTrophy({
    key: "EXECUTIONER",
    title: "Executor Supremo",
    shortTitle: "Executor",
    description: "Registre 1.500 eliminações no ranking.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/executioner.svg",
    color: "#a855f7",
    points: 4200,
    tier: 8,
    rarity: "Mítico",
    badgeText: "1.5K",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "1.500 kills",
    metric: "kills",
    target: 1500,
    unit: "kills"
  }),
  metricTrophy({
    key: "RAIDZ_LEGEND",
    title: "Lenda do RAID-Z",
    shortTitle: "Lenda RAID-Z",
    description: "Conquiste 2.500 eliminações e entre para a história.",
    icon: "☠",
    imageUrl: "/images/ranking/trophies/raidz-legend.svg",
    color: "#e879f9",
    points: 6000,
    tier: 10,
    rarity: "Mítico",
    badgeText: "2.5K",
    category: "KILLS",
    categoryLabel: "Eliminações",
    targetLabel: "2.500 kills",
    metric: "kills",
    target: 2500,
    unit: "kills"
  }),
  metricTrophy({
    key: "HEADHUNTER",
    title: "Caçador de Cabeças",
    shortTitle: "Head Hunter",
    description: "Registre 15 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/headhunter.svg",
    color: "#f97316",
    points: 160,
    tier: 1,
    rarity: "Bronze",
    badgeText: "15HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "15 headshots",
    metric: "headshots",
    target: 15,
    unit: "HS"
  }),
  metricTrophy({
    key: "LETHAL_PRECISION",
    title: "Precisão Letal",
    shortTitle: "Precisão Letal",
    description: "Alcance 50 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/lethal-precision.svg",
    color: "#f7bd44",
    points: 500,
    tier: 3,
    rarity: "Ouro",
    badgeText: "50HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "50 headshots",
    metric: "headshots",
    target: 50,
    unit: "HS"
  }),
  metricTrophy({
    key: "HEADSHOT_MASTER",
    title: "Mestre do Headshot",
    shortTitle: "Mestre HS",
    description: "Conquiste 100 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/headshot-master.svg",
    color: "#22c55e",
    points: 900,
    tier: 4,
    rarity: "Esmeralda",
    badgeText: "100HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "100 headshots",
    metric: "headshots",
    target: 100,
    unit: "HS"
  }),
  metricTrophy({
    key: "DEAD_EYE",
    title: "Olho Mortal",
    shortTitle: "Olho Mortal",
    description: "Conquiste 200 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/dead-eye.svg",
    color: "#38bdf8",
    points: 1500,
    tier: 5,
    rarity: "Safira",
    badgeText: "200HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "200 headshots",
    metric: "headshots",
    target: 200,
    unit: "HS"
  }),
  metricTrophy({
    key: "PERFECT_SHOT",
    title: "Tiro Perfeito",
    shortTitle: "Tiro Perfeito",
    description: "Conquiste 350 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/perfect-shot.svg",
    color: "#60a5fa",
    points: 2200,
    tier: 6,
    rarity: "Diamante",
    badgeText: "350HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "350 headshots",
    metric: "headshots",
    target: 350,
    unit: "HS"
  }),
  metricTrophy({
    key: "SKULL_COLLECTOR",
    title: "Colecionador de Crânios",
    shortTitle: "Colecionador",
    description: "Conquiste 500 headshots.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/skull-collector.svg",
    color: "#ef4444",
    points: 3200,
    tier: 7,
    rarity: "Rubi",
    badgeText: "500HS",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "500 headshots",
    metric: "headshots",
    target: 500,
    unit: "HS"
  }),
  {
    key: "SURGICAL_PRECISION",
    title: "Precisão Cirúrgica",
    shortTitle: "Cirúrgico",
    description: "Mantenha 30% de headshots após 50 kills.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/surgical-precision.svg",
    color: "#10b981",
    points: 1200,
    tier: 5,
    rarity: "Esmeralda",
    badgeText: "30%",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "50 kills e 30% HS",
    achieved: (s) => safeNumber(s.kills) >= 50 && safeNumber(s.headshotRate) >= 30,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 50,
      safeNumber(s.headshotRate), 30,
      `${Math.floor(safeNumber(s.kills))}/50 kills • HS ${safeNumber(s.headshotRate).toFixed(1)}%/30%`
    )
  },
  {
    key: "EAGLE_EYE",
    title: "Olho de Águia",
    shortTitle: "Águia",
    description: "Mantenha 45% de headshots após 100 kills.",
    icon: "◎",
    imageUrl: "/images/ranking/trophies/eagle-eye.svg",
    color: "#3b82f6",
    points: 2600,
    tier: 7,
    rarity: "Diamante",
    badgeText: "45%",
    category: "PRECISION",
    categoryLabel: "Precisão",
    targetLabel: "100 kills e 45% HS",
    achieved: (s) => safeNumber(s.kills) >= 100 && safeNumber(s.headshotRate) >= 45,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 100,
      safeNumber(s.headshotRate), 45,
      `${Math.floor(safeNumber(s.kills))}/100 kills • HS ${safeNumber(s.headshotRate).toFixed(1)}%/45%`
    )
  },
  metricTrophy({
    key: "SNIPER",
    title: "Atirador de Elite",
    shortTitle: "Sniper",
    description: "Elimine alguém a pelo menos 300 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/sniper.svg",
    color: "#38bdf8",
    points: 300,
    tier: 2,
    rarity: "Safira",
    badgeText: "300M",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 300m",
    metric: "longestKill",
    target: 300,
    unit: "m"
  }),
  metricTrophy({
    key: "LONGSHOT_MASTER",
    title: "Mestre da Longa Distância",
    shortTitle: "Longshot",
    description: "Elimine alguém a pelo menos 600 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/longshot-master.svg",
    color: "#a78bfa",
    points: 800,
    tier: 4,
    rarity: "Obsidiana",
    badgeText: "600M",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 600m",
    metric: "longestKill",
    target: 600,
    unit: "m"
  }),
  metricTrophy({
    key: "EXTREME_SHOT",
    title: "Tiro Extremo",
    shortTitle: "Extremo",
    description: "Elimine alguém a pelo menos 800 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/extreme-shot.svg",
    color: "#f7bd44",
    points: 1400,
    tier: 5,
    rarity: "Ouro",
    badgeText: "800M",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 800m",
    metric: "longestKill",
    target: 800,
    unit: "m"
  }),
  metricTrophy({
    key: "IMPOSSIBLE_SHOT",
    title: "Tiro Impossível",
    shortTitle: "Impossível",
    description: "Elimine alguém a pelo menos 1.000 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/impossible-shot.svg",
    color: "#ef4444",
    points: 2400,
    tier: 7,
    rarity: "Rubi",
    badgeText: "1KM",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 1.000m",
    metric: "longestKill",
    target: 1000,
    unit: "m"
  }),
  metricTrophy({
    key: "HORIZON_HUNTER",
    title: "Caçador do Horizonte",
    shortTitle: "Horizonte",
    description: "Elimine alguém a pelo menos 1.200 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/horizon-hunter.svg",
    color: "#8b5cf6",
    points: 3400,
    tier: 8,
    rarity: "Obsidiana",
    badgeText: "1.2KM",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 1.200m",
    metric: "longestKill",
    target: 1200,
    unit: "m"
  }),
  metricTrophy({
    key: "DISTANCE_LEGEND",
    title: "Lenda da Distância",
    shortTitle: "Lenda Longshot",
    description: "Elimine alguém a pelo menos 1.500 metros.",
    icon: "⌖",
    imageUrl: "/images/ranking/trophies/distance-legend.svg",
    color: "#e879f9",
    points: 5000,
    tier: 10,
    rarity: "Mítico",
    badgeText: "1.5KM",
    category: "DISTANCE",
    categoryLabel: "Distância",
    targetLabel: "Kill de 1.500m",
    metric: "longestKill",
    target: 1500,
    unit: "m"
  }),
  {
    key: "SURVIVOR",
    title: "Sobrevivente",
    shortTitle: "Sobrevivente",
    description: "Mantenha KD 2.00 ou maior após 25 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/survivor.svg",
    color: "#94a3b8",
    points: 400,
    tier: 2,
    rarity: "Prata",
    badgeText: "KD2",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "25 kills e KD 2.00",
    achieved: (s) => safeNumber(s.kills) >= 25 && safeNumber(s.kd) >= 2,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 25,
      safeNumber(s.kd), 2,
      `${Math.floor(safeNumber(s.kills))}/25 kills • KD ${safeNumber(s.kd).toFixed(2)}/2.00`
    )
  },
  {
    key: "UNTOUCHABLE",
    title: "Intocável",
    shortTitle: "Intocável",
    description: "Mantenha KD 4.00 ou maior após 75 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/untouchable.svg",
    color: "#22c55e",
    points: 1000,
    tier: 4,
    rarity: "Esmeralda",
    badgeText: "KD4",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "75 kills e KD 4.00",
    achieved: (s) => safeNumber(s.kills) >= 75 && safeNumber(s.kd) >= 4,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 75,
      safeNumber(s.kd), 4,
      `${Math.floor(safeNumber(s.kills))}/75 kills • KD ${safeNumber(s.kd).toFixed(2)}/4.00`
    )
  },
  {
    key: "HARD_TARGET",
    title: "Alvo Difícil",
    shortTitle: "Alvo Difícil",
    description: "Mantenha KD 1.50 ou maior após 50 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/hard-target.svg",
    color: "#cbd5e1",
    points: 550,
    tier: 3,
    rarity: "Prata",
    badgeText: "KD1.5",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "50 kills e KD 1.50",
    achieved: (s) => safeNumber(s.kills) >= 50 && safeNumber(s.kd) >= 1.5,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 50,
      safeNumber(s.kd), 1.5,
      `${Math.floor(safeNumber(s.kills))}/50 kills • KD ${safeNumber(s.kd).toFixed(2)}/1.50`
    )
  },
  {
    key: "ELITE_SURVIVOR",
    title: "Sobrevivente de Elite",
    shortTitle: "Elite",
    description: "Mantenha KD 3.00 ou maior após 150 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/elite-survivor.svg",
    color: "#38bdf8",
    points: 1600,
    tier: 6,
    rarity: "Safira",
    badgeText: "KD3",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "150 kills e KD 3.00",
    achieved: (s) => safeNumber(s.kills) >= 150 && safeNumber(s.kd) >= 3,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 150,
      safeNumber(s.kd), 3,
      `${Math.floor(safeNumber(s.kills))}/150 kills • KD ${safeNumber(s.kd).toFixed(2)}/3.00`
    )
  },
  {
    key: "IMMORTAL",
    title: "Imortal",
    shortTitle: "Imortal",
    description: "Mantenha KD 5.00 ou maior após 250 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/immortal.svg",
    color: "#a855f7",
    points: 3000,
    tier: 8,
    rarity: "Mítico",
    badgeText: "KD5",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "250 kills e KD 5.00",
    achieved: (s) => safeNumber(s.kills) >= 250 && safeNumber(s.kd) >= 5,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 250,
      safeNumber(s.kd), 5,
      `${Math.floor(safeNumber(s.kills))}/250 kills • KD ${safeNumber(s.kd).toFixed(2)}/5.00`
    )
  },
  {
    key: "PERFECT_HUNTER",
    title: "Caçador Perfeito",
    shortTitle: "Perfeito",
    description: "Mantenha KD 4.00 ou maior após 100 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/perfect-hunter.svg",
    color: "#f7bd44",
    points: 1800,
    tier: 6,
    rarity: "Ouro",
    badgeText: "25D",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "100 kills e KD 4.00",
    achieved: (s) => safeNumber(s.kills) >= 100 && safeNumber(s.kd) >= 4,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 100,
      safeNumber(s.kd), 4,
      `${Math.floor(safeNumber(s.kills))}/100 kills • KD ${safeNumber(s.kd).toFixed(2)}/4.00`
    )
  },
  {
    key: "DOMINATOR",
    title: "Dominador",
    shortTitle: "Dominador",
    description: "Mantenha KD 3.00 ou maior após 500 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/dominator.svg",
    color: "#ef4444",
    points: 3600,
    tier: 8,
    rarity: "Rubi",
    badgeText: "500",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "500 kills e KD 3.00",
    achieved: (s) => safeNumber(s.kills) >= 500 && safeNumber(s.kd) >= 3,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 500,
      safeNumber(s.kd), 3,
      `${Math.floor(safeNumber(s.kills))}/500 kills • KD ${safeNumber(s.kd).toFixed(2)}/3.00`
    )
  },
  {
    key: "NO_MERCY",
    title: "Sem Misericórdia",
    shortTitle: "Sem Misericórdia",
    description: "Mantenha KD 4.00 ou maior após 1.000 kills.",
    icon: "◆",
    imageUrl: "/images/ranking/trophies/no-mercy.svg",
    color: "#e879f9",
    points: 5200,
    tier: 10,
    rarity: "Mítico",
    badgeText: "1K",
    category: "SURVIVAL",
    categoryLabel: "Sobrevivência",
    targetLabel: "1.000 kills e KD 4.00",
    achieved: (s) => safeNumber(s.kills) >= 1000 && safeNumber(s.kd) >= 4,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 1000,
      safeNumber(s.kd), 4,
      `${Math.floor(safeNumber(s.kills))}/1000 kills • KD ${safeNumber(s.kd).toFixed(2)}/4.00`
    )
  },
  metricTrophy({
    key: "RIVAL_HUNTER",
    title: "Caçador de Rivais",
    shortTitle: "Rival",
    description: "Elimine o mesmo adversário pelo menos 5 vezes.",
    icon: "⚔",
    imageUrl: "/images/ranking/trophies/rival-hunter.svg",
    color: "#e879f9",
    points: 240,
    tier: 2,
    rarity: "Ametista",
    badgeText: "X5",
    category: "RIVALRY",
    categoryLabel: "Rivalidade",
    targetLabel: "Mesmo rival x5",
    metric: "topVictimCount",
    target: 5,
    unit: "vezes"
  }),
  metricTrophy({
    key: "NEMESIS",
    title: "Nêmesis",
    shortTitle: "Nêmesis",
    description: "Elimine o mesmo adversário 10 vezes.",
    icon: "⚔",
    imageUrl: "/images/ranking/trophies/nemesis.svg",
    color: "#f97316",
    points: 700,
    tier: 4,
    rarity: "Ouro",
    badgeText: "X10",
    category: "RIVALRY",
    categoryLabel: "Rivalidade",
    targetLabel: "Mesmo rival x10",
    metric: "topVictimCount",
    target: 10,
    unit: "vezes"
  }),
  metricTrophy({
    key: "OBSESSION",
    title: "Obsessão",
    shortTitle: "Obsessão",
    description: "Elimine o mesmo adversário 20 vezes.",
    icon: "⚔",
    imageUrl: "/images/ranking/trophies/obsession.svg",
    color: "#ef4444",
    points: 1400,
    tier: 6,
    rarity: "Rubi",
    badgeText: "X20",
    category: "RIVALRY",
    categoryLabel: "Rivalidade",
    targetLabel: "Mesmo rival x20",
    metric: "topVictimCount",
    target: 20,
    unit: "vezes"
  }),
  metricTrophy({
    key: "RIVAL_EXECUTIONER",
    title: "Executor de Rivais",
    shortTitle: "Executor Rival",
    description: "Elimine o mesmo adversário 35 vezes.",
    icon: "⚔",
    imageUrl: "/images/ranking/trophies/rival-executioner.svg",
    color: "#8b5cf6",
    points: 2500,
    tier: 8,
    rarity: "Obsidiana",
    badgeText: "X35",
    category: "RIVALRY",
    categoryLabel: "Rivalidade",
    targetLabel: "Mesmo rival x35",
    metric: "topVictimCount",
    target: 35,
    unit: "vezes"
  }),
  metricTrophy({
    key: "PERSONAL_NIGHTMARE",
    title: "Pesadelo Particular",
    shortTitle: "Pesadelo",
    description: "Elimine o mesmo adversário 50 vezes.",
    icon: "⚔",
    imageUrl: "/images/ranking/trophies/personal-nightmare.svg",
    color: "#e879f9",
    points: 4200,
    tier: 10,
    rarity: "Mítico",
    badgeText: "X50",
    category: "RIVALRY",
    categoryLabel: "Rivalidade",
    targetLabel: "Mesmo rival x50",
    metric: "topVictimCount",
    target: 50,
    unit: "vezes"
  }),
  metricTrophy({
    key: "ARSENAL_MASTER",
    title: "Mestre do Arsenal",
    shortTitle: "Arsenal",
    description: "Registre eliminações com 8 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/arsenal-master.svg",
    color: "#06b6d4",
    points: 300,
    tier: 2,
    rarity: "Safira",
    badgeText: "8 ARM",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "8 armas diferentes",
    metric: "uniqueWeapons",
    target: 8,
    unit: "armas"
  }),
  metricTrophy({
    key: "WEAPON_COLLECTOR",
    title: "Colecionador de Armas",
    shortTitle: "Colecionador",
    description: "Registre eliminações com 12 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/weapon-collector.svg",
    color: "#22c55e",
    points: 700,
    tier: 4,
    rarity: "Esmeralda",
    badgeText: "12 ARM",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "12 armas diferentes",
    metric: "uniqueWeapons",
    target: 12,
    unit: "armas"
  }),
  metricTrophy({
    key: "FULL_ARSENAL",
    title: "Arsenal Completo",
    shortTitle: "Arsenal Completo",
    description: "Registre eliminações com 16 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/full-arsenal.svg",
    color: "#38bdf8",
    points: 1300,
    tier: 6,
    rarity: "Diamante",
    badgeText: "16 ARM",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "16 armas diferentes",
    metric: "uniqueWeapons",
    target: 16,
    unit: "armas"
  }),
  metricTrophy({
    key: "WEAPON_EXPERT",
    title: "Especialista em Armas",
    shortTitle: "Especialista",
    description: "Registre eliminações com 20 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/weapon-expert.svg",
    color: "#f7bd44",
    points: 2200,
    tier: 7,
    rarity: "Ouro",
    badgeText: "20 ARM",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "20 armas diferentes",
    metric: "uniqueWeapons",
    target: 20,
    unit: "armas"
  }),
  metricTrophy({
    key: "ARMORY_LEGEND",
    title: "Lenda do Arsenal",
    shortTitle: "Lenda Arsenal",
    description: "Registre eliminações com 25 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/armory-legend.svg",
    color: "#a855f7",
    points: 3600,
    tier: 9,
    rarity: "Mítico",
    badgeText: "25 ARM",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "25 armas diferentes",
    metric: "uniqueWeapons",
    target: 25,
    unit: "armas"
  }),
  {
    key: "VERSATILE_KILLER",
    title: "Assassino Versátil",
    shortTitle: "Versátil",
    description: "Alcance 100 kills usando pelo menos 10 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/versatile-killer.svg",
    color: "#10b981",
    points: 1500,
    tier: 6,
    rarity: "Esmeralda",
    badgeText: "10+",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "100 kills e 10 armas",
    achieved: (s) => safeNumber(s.kills) >= 100 && safeNumber(s.uniqueWeapons) >= 10,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 100,
      safeNumber(s.uniqueWeapons), 10,
      `${Math.floor(safeNumber(s.kills))}/100 kills • ${Math.floor(safeNumber(s.uniqueWeapons))}/10 armas`
    )
  },
  {
    key: "MASTER_OF_ALL",
    title: "Mestre de Todas as Armas",
    shortTitle: "Mestre Total",
    description: "Alcance 500 kills usando pelo menos 20 armas diferentes.",
    icon: "✦",
    imageUrl: "/images/ranking/trophies/master-of-all.svg",
    color: "#e879f9",
    points: 4800,
    tier: 10,
    rarity: "Mítico",
    badgeText: "20+",
    category: "WEAPONS",
    categoryLabel: "Arsenal",
    targetLabel: "500 kills e 20 armas",
    achieved: (s) => safeNumber(s.kills) >= 500 && safeNumber(s.uniqueWeapons) >= 20,
    progress: (s) => pairedProgress(
      safeNumber(s.kills), 500,
      safeNumber(s.uniqueWeapons), 20,
      `${Math.floor(safeNumber(s.kills))}/500 kills • ${Math.floor(safeNumber(s.uniqueWeapons))}/20 armas`
    )
  },
  {
    key: "COMBAT_INITIATE",
    title: "Iniciado no Combate",
    shortTitle: "Iniciado",
    description: "Alcance 25 kills e 5 headshots.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/combat-initiate.svg",
    color: "#cd7f32",
    points: 350,
    tier: 2,
    rarity: "Bronze",
    badgeText: "I",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "25 kills e 5 HS",
    achieved: (s) => safeNumber(s.kills) >= 25 && safeNumber(s.headshots) >= 5,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 25],
      [safeNumber(s.headshots), 5]
    ], `${Math.floor(safeNumber(s.kills))}/25 kills • ${Math.floor(safeNumber(s.headshots))}/5 HS`)
  },
  {
    key: "ELITE_COMBATANT",
    title: "Combatente de Elite",
    shortTitle: "Elite",
    description: "Alcance 100 kills, 25 headshots e um tiro de 300m.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/elite-combatant.svg",
    color: "#38bdf8",
    points: 1200,
    tier: 5,
    rarity: "Safira",
    badgeText: "II",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "100 kills • 25 HS • 300m",
    achieved: (s) => safeNumber(s.kills) >= 100 && safeNumber(s.headshots) >= 25 && safeNumber(s.longestKill) >= 300,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 100],
      [safeNumber(s.headshots), 25],
      [safeNumber(s.longestKill), 300]
    ], `${Math.floor(safeNumber(s.kills))}/100 kills • ${Math.floor(safeNumber(s.headshots))}/25 HS • ${Math.round(safeNumber(s.longestKill))}/300 m`)
  },
  {
    key: "BATTLE_VETERAN",
    title: "Veterano de Batalha",
    shortTitle: "Veterano",
    description: "Alcance 250 kills e use 10 armas diferentes.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/battle-veteran.svg",
    color: "#f7bd44",
    points: 2300,
    tier: 7,
    rarity: "Ouro",
    badgeText: "III",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "250 kills e 10 armas",
    achieved: (s) => safeNumber(s.kills) >= 250 && safeNumber(s.uniqueWeapons) >= 10,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 250],
      [safeNumber(s.uniqueWeapons), 10]
    ], `${Math.floor(safeNumber(s.kills))}/250 kills • ${Math.floor(safeNumber(s.uniqueWeapons))}/10 armas`)
  },
  {
    key: "LETHAL_MACHINE",
    title: "Máquina Letal",
    shortTitle: "Máquina Letal",
    description: "Alcance 500 kills, 100 headshots e KD 2.00.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/lethal-machine.svg",
    color: "#ef4444",
    points: 3600,
    tier: 8,
    rarity: "Rubi",
    badgeText: "IV",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "500 kills • 100 HS • KD 2",
    achieved: (s) => safeNumber(s.kills) >= 500 && safeNumber(s.headshots) >= 100 && safeNumber(s.kd) >= 2,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 500],
      [safeNumber(s.headshots), 100],
      [safeNumber(s.kd), 2]
    ], `${Math.floor(safeNumber(s.kills))}/500 kills • ${Math.floor(safeNumber(s.headshots))}/100 HS • KD ${safeNumber(s.kd).toFixed(2)}/2.00`)
  },
  {
    key: "SUPREME_WARRIOR",
    title: "Guerreiro Supremo",
    shortTitle: "Supremo",
    description: "Alcance 1.000 kills, 250 headshots e 15 armas diferentes.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/supreme-warrior.svg",
    color: "#8b5cf6",
    points: 5200,
    tier: 9,
    rarity: "Obsidiana",
    badgeText: "V",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "1.000 kills • 250 HS • 15 armas",
    achieved: (s) => safeNumber(s.kills) >= 1000 && safeNumber(s.headshots) >= 250 && safeNumber(s.uniqueWeapons) >= 15,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 1000],
      [safeNumber(s.headshots), 250],
      [safeNumber(s.uniqueWeapons), 15]
    ], `${Math.floor(safeNumber(s.kills))}/1000 kills • ${Math.floor(safeNumber(s.headshots))}/250 HS • ${Math.floor(safeNumber(s.uniqueWeapons))}/15 armas`)
  },
  {
    key: "MYTHIC_LEGEND",
    title: "Lenda Mítica",
    shortTitle: "Lenda Mítica",
    description: "Complete a jornada máxima de combate do RAID-Z.",
    icon: "★",
    imageUrl: "/images/ranking/trophies/mythic-legend.svg",
    color: "#e879f9",
    points: 10000,
    tier: 10,
    rarity: "Mítico",
    badgeText: "★",
    category: "LEGEND",
    categoryLabel: "Lendário",
    targetLabel: "2.500 kills • 500 HS • 1.000m • KD 3 • 20 armas",
    achieved: (s) => safeNumber(s.kills) >= 2500 && safeNumber(s.headshots) >= 500 && safeNumber(s.longestKill) >= 1000 && safeNumber(s.uniqueWeapons) >= 20 && safeNumber(s.kd) >= 3,
    progress: (s) => multiProgress([
      [safeNumber(s.kills), 2500],
      [safeNumber(s.headshots), 500],
      [safeNumber(s.longestKill), 1000],
      [safeNumber(s.uniqueWeapons), 20],
      [safeNumber(s.kd), 3]
    ], `${Math.floor(safeNumber(s.kills))}/2500 kills • ${Math.floor(safeNumber(s.headshots))}/500 HS • ${Math.round(safeNumber(s.longestKill))}/1000 m • ${Math.floor(safeNumber(s.uniqueWeapons))}/20 armas • KD ${safeNumber(s.kd).toFixed(2)}/3.00`)
  }
];

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function buildAutomaticTrophyStats(events = [], steam64 = '') {
  const kills = events.filter((event) => event.killerSteam64 === steam64);
  const deaths = events.filter((event) => event.victimSteam64 === steam64).length;
  const headshots = kills.filter((event) => event.headshot).length;
  const longestKill = kills.reduce((max, event) => Math.max(max, safeNumber(event.distanceMeters)), 0);
  const weapons = new Set();
  const victims = new Map();

  for (const event of kills) {
    const weapon = String(event.weapon || '').trim();
    if (weapon && weapon.toLowerCase() !== 'desconhecida') weapons.add(weapon);
    const victimKey = String(event.victimSteam64 || event.victimName || '').trim();
    if (victimKey) victims.set(victimKey, (victims.get(victimKey) || 0) + 1);
  }

  const topVictimCount = Math.max(0, ...victims.values());
  const kd = deaths > 0 ? kills.length / deaths : kills.length;
  return {
    kills: kills.length,
    deaths,
    headshots,
    longestKill,
    uniqueWeapons: weapons.size,
    topVictimCount,
    kd,
    headshotRate: kills.length ? (headshots / kills.length) * 100 : 0
  };
}

export function getAutomaticTrophyCatalog() {
  return AUTOMATIC_TROPHY_CATALOG.map(({ achieved, progress, ...rule }) => ({ ...rule }));
}

export function getAutomaticTrophyProgress(stats, earnedKeys = []) {
  const earned = new Set(earnedKeys);
  return AUTOMATIC_TROPHY_CATALOG.map((rule) => {
    const rawProgress = rule.progress(stats);
    const value = Math.max(0, safeNumber(rawProgress.value));
    const target = Math.max(1, safeNumber(rawProgress.target));
    return {
      key: rule.key,
      title: rule.title,
      shortTitle: rule.shortTitle,
      description: rule.description,
      imageUrl: rule.imageUrl,
      icon: rule.icon,
      color: rule.color,
      points: rule.points,
      tier: rule.tier,
      rarity: rule.rarity,
      badgeText: rule.badgeText,
      category: rule.category,
      categoryLabel: rule.categoryLabel,
      targetLabel: rule.targetLabel,
      earned: earned.has(rule.key),
      achieved: rule.achieved(stats),
      value,
      target,
      percent: Math.max(0, Math.min(100, Math.round((value / target) * 100))),
      progressLabel: rawProgress.label
    };
  });
}

export async function syncAutomaticPlayerTrophies(steam64, { serverType = 'global' } = {}) {
  const cleanSteam64 = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleanSteam64)) return { steam64: cleanSteam64, created: 0, earned: [] };

  const [events, player, existing] = await Promise.all([
    prisma.killEvent.findMany({
      where: {
        ...(serverType === 'global' ? {} : { serverType }),
        OR: [{ killerSteam64: cleanSteam64 }, { victimSteam64: cleanSteam64 }]
      },
      select: {
        killerSteam64: true,
        victimSteam64: true,
        victimName: true,
        weapon: true,
        distanceMeters: true,
        headshot: true
      },
      orderBy: { occurredAt: 'desc' },
      take: MAX_EVENTS_PER_PLAYER
    }),
    prisma.player.findUnique({ where: { steam64: cleanSteam64 }, select: { nickname: true } }),
    prisma.playerBadge.findMany({
      where: { steam64: cleanSteam64, source: 'AUTOMATIC', serverType },
      select: { id: true, ruleKey: true }
    })
  ]);

  const stats = buildAutomaticTrophyStats(events, cleanSteam64);
  const existingKeys = new Set(existing.map((badge) => badge.ruleKey).filter(Boolean));
  const earnedRules = AUTOMATIC_TROPHY_CATALOG.filter((rule) => rule.achieved(stats));
  const newRules = earnedRules.filter((rule) => !existingKeys.has(rule.key));

  if (newRules.length) {
    await prisma.$transaction(newRules.map((rule) => prisma.playerBadge.upsert({
      where: { automaticKey: `auto:${serverType}:${cleanSteam64}:${rule.key}` },
      update: {
        playerName: player?.nickname || null,
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
        imageUrl: rule.imageUrl,
        color: rule.color,
        points: rule.points,
        tier: rule.tier,
        metadata: { category: rule.category, categoryLabel: rule.categoryLabel, rarity: rule.rarity, targetLabel: rule.targetLabel, automatic: true },
        visible: true
      },
      create: {
        automaticKey: `auto:${serverType}:${cleanSteam64}:${rule.key}`,
        steam64: cleanSteam64,
        playerName: player?.nickname || null,
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
        imageUrl: rule.imageUrl,
        color: rule.color,
        points: rule.points,
        source: 'AUTOMATIC',
        ruleKey: rule.key,
        tier: rule.tier,
        serverType,
        metadata: { category: rule.category, categoryLabel: rule.categoryLabel, rarity: rule.rarity, targetLabel: rule.targetLabel, automatic: true },
        visible: true
      }
    })));
  }

  if (player?.nickname) {
    await prisma.playerBadge.updateMany({
      where: {
        steam64: cleanSteam64,
        source: 'AUTOMATIC',
        OR: [{ playerName: null }, { playerName: { not: player.nickname } }]
      },
      data: { playerName: player.nickname }
    });
  }

  return { steam64: cleanSteam64, created: newRules.length, earned: earnedRules.map((rule) => rule.key), stats };
}

const pendingSteam64 = new Set();
let syncTimer = null;
let syncRunning = false;

async function flushAutomaticTrophyQueue() {
  if (syncRunning) return;
  syncRunning = true;
  syncTimer = null;
  try {
    while (pendingSteam64.size) {
      const batch = Array.from(pendingSteam64).slice(0, 8);
      batch.forEach((steam64) => pendingSteam64.delete(steam64));
      await Promise.all(batch.map(async (steam64) => {
        try {
          await syncAutomaticPlayerTrophies(steam64);
        } catch (error) {
          console.error(`Troféus automáticos ${steam64}:`, error.message);
        }
      }));
    }
  } finally {
    syncRunning = false;
    if (pendingSteam64.size && !syncTimer) {
      syncTimer = setTimeout(flushAutomaticTrophyQueue, 1200);
      syncTimer.unref?.();
    }
  }
}

export function queueAutomaticTrophySync(steam64Values = []) {
  for (const value of steam64Values) {
    const steam64 = String(value || '').trim();
    if (/^7656119\d{10}$/.test(steam64)) pendingSteam64.add(steam64);
  }
  if (!syncTimer && pendingSteam64.size) {
    syncTimer = setTimeout(flushAutomaticTrophyQueue, 1200);
    syncTimer.unref?.();
  }
}

export async function syncAutomaticTrophiesForActivePlayers({ limit = 1000 } = {}) {
  const [killers, victims] = await Promise.all([
    prisma.killEvent.findMany({ distinct: ['killerSteam64'], select: { killerSteam64: true }, take: limit }),
    prisma.killEvent.findMany({ distinct: ['victimSteam64'], select: { victimSteam64: true }, take: limit })
  ]);
  const steam64Values = Array.from(new Set([
    ...killers.map((row) => row.killerSteam64),
    ...victims.map((row) => row.victimSteam64)
  ].filter(Boolean))).slice(0, limit);

  let created = 0;
  for (let index = 0; index < steam64Values.length; index += 8) {
    const batch = steam64Values.slice(index, index + 8);
    const results = await Promise.all(batch.map((steam64) => syncAutomaticPlayerTrophies(steam64).catch((error) => {
      console.error(`Backfill de troféus ${steam64}:`, error.message);
      return { created: 0 };
    })));
    created += results.reduce((sum, result) => sum + Number(result.created || 0), 0);
  }
  return { players: steam64Values.length, created };
}
