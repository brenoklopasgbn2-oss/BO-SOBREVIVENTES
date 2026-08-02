function finiteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string'
    ? value.replace(',', '.').replace(/[^0-9eE+.-]/g, '')
    : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function getPath(object, path) {
  let current = object;
  for (const part of String(path).split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function firstDefined(object, paths = []) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function parseDayzPosition(value) {
  if (value === undefined || value === null || value === '') return null;

  if (Array.isArray(value)) {
    const values = value.map(finiteNumber).filter(v => v !== null);
    if (values.length >= 3) return { x: values[0], y: values[1], z: values[2] };
    if (values.length === 2) return { x: values[0], y: null, z: values[1] };
    return null;
  }

  if (typeof value === 'string') {
    const matches = value.match(/-?\d+(?:[.,]\d+)?/g) || [];
    const values = matches.map(finiteNumber).filter(v => v !== null);
    if (values.length >= 3) return { x: values[0], y: values[1], z: values[2] };
    if (values.length === 2) return { x: values[0], y: null, z: values[1] };
    return null;
  }

  if (typeof value === 'object') {
    const nested = firstDefined(value, ['position', 'pos', 'coordinates', 'coords', 'location']);
    if (nested && nested !== value) {
      const parsedNested = parseDayzPosition(nested);
      if (parsedNested) return parsedNested;
    }

    const x = finiteNumber(firstDefined(value, ['x', 'X', 'posX', 'positionX', 'coordX', 'worldX', '0']));
    const y = finiteNumber(firstDefined(value, ['y', 'Y', 'posY', 'positionY', 'coordY', 'worldY', '1']));
    const z = finiteNumber(firstDefined(value, ['z', 'Z', 'posZ', 'positionZ', 'coordZ', 'worldZ', '2']));
    if (x !== null && z !== null) return { x, y, z };
    if (x !== null && y !== null && z === null) return { x, y: null, z: y };
  }

  return null;
}

function scalarPosition(root, prefix) {
  const x = finiteNumber(firstDefined(root, [
    `${prefix}PosX`, `${prefix}PositionX`, `${prefix}X`, `${prefix}.posX`, `${prefix}.positionX`, `${prefix}.x`
  ]));
  const y = finiteNumber(firstDefined(root, [
    `${prefix}PosY`, `${prefix}PositionY`, `${prefix}Y`, `${prefix}.posY`, `${prefix}.positionY`, `${prefix}.y`
  ]));
  const z = finiteNumber(firstDefined(root, [
    `${prefix}PosZ`, `${prefix}PositionZ`, `${prefix}Z`, `${prefix}.posZ`, `${prefix}.positionZ`, `${prefix}.z`
  ]));
  return x !== null && z !== null ? { x, y, z } : null;
}

export function extractKillPositions(data = {}) {
  const root = data?.data && typeof data.data === 'object'
    ? { ...data, ...data.data }
    : data?.event && typeof data.event === 'object'
      ? { ...data, ...data.event }
      : data?.kill && typeof data.kill === 'object'
        ? { ...data, ...data.kill }
        : data?.death && typeof data.death === 'object'
          ? { ...data, ...data.death }
          : (data || {});

  const killerCandidate = firstDefined(root, [
    'killerPosition', 'killerPos', 'killerCoordinates', 'killerCoords',
    'attackerPosition', 'attackerPos', 'attackerCoordinates', 'attackerCoords',
    'sourcePosition', 'sourcePos', 'killer.position', 'attacker.position', 'source.position'
  ]);
  const victimCandidate = firstDefined(root, [
    'victimPosition', 'victimPos', 'victimCoordinates', 'victimCoords',
    'targetPosition', 'targetPos', 'deathPosition', 'deadPosition',
    'victim.position', 'target.position', 'deadPlayer.position'
  ]);
  const genericCandidate = firstDefined(root, [
    'position', 'pos', 'coordinates', 'coords', 'worldPosition', 'worldPos', 'deathLocation', 'locationPosition', 'positionText', 'location'
  ]);

  const killer = parseDayzPosition(killerCandidate)
    || scalarPosition(root, 'killer')
    || scalarPosition(root, 'attacker')
    || scalarPosition(root, 'source');
  const victim = parseDayzPosition(victimCandidate)
    || scalarPosition(root, 'victim')
    || scalarPosition(root, 'target')
    || scalarPosition(root, 'dead')
    || parseDayzPosition(genericCandidate);

  return { killer, victim };
}

export function killPositionFields(data = {}) {
  const { killer, victim } = extractKillPositions(data);
  return {
    killerPosX: killer?.x ?? null,
    killerPosY: killer?.y ?? null,
    killerPosZ: killer?.z ?? null,
    victimPosX: victim?.x ?? null,
    victimPosY: victim?.y ?? null,
    victimPosZ: victim?.z ?? null
  };
}
