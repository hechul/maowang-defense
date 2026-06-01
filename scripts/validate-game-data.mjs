import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFile(join(root, rel), 'utf8');

const uniq = (items) => [...new Set(items)];
const quotedValues = (body) => uniq([...body.matchAll(/'([^']+)'/g)].map((m) => m[1]));
const valuesForKey = (text, key) =>
  uniq([...text.matchAll(new RegExp(`${key}:\\s*'([^']+)'`, 'g'))].map((m) => m[1]));
const arraysForKey = (text, key) =>
  [...text.matchAll(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 'g'))]
    .flatMap((m) => quotedValues(m[1]));
const objectKeysForKey = (text, key) =>
  [...text.matchAll(new RegExp(`${key}:\\s*\\{([^}]*)\\}`, 'g'))]
    .flatMap((m) => [...m[1].matchAll(/([A-Za-z0-9_]+)\s*:/g)].map((x) => x[1]));
const synergyGoalIds = (text) =>
  uniq([...text.matchAll(/synergyActiveProcs:\s*\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]));
const topLevelArrayIds = (text) =>
  uniq([...text.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]));
const stageBossConfigs = (text) =>
  [...text.matchAll(/id:\s*'(ch\d+_s\d+)'[\s\S]*?waveLimit:\s*(\d+)[\s\S]*?bossId:\s*'([^']+)'/g)]
    .map((m) => ({ id: m[1], waveLimit: Number(m[2]), bossId: m[3] }));
const idsInFile = (text) => valuesForKey(text, 'id');

const [
  stagesText,
  recruitsText,
  monstersText,
  heroesText,
  bossesText,
  strataText,
  buildsText,
  relicsText,
  synergiesText,
] = await Promise.all([
  read('src/game/data/stages.ts'),
  read('src/game/data/recruits.ts'),
  read('src/game/data/monsters.ts'),
  read('src/game/data/heroes.ts'),
  read('src/game/data/bosses.ts'),
  read('src/game/data/strata.ts'),
  read('src/game/data/builds.ts'),
  read('src/game/data/relics.ts'),
  read('src/game/data/synergies.ts'),
]);

const stageIds = uniq([...stagesText.matchAll(/id:\s*'(ch\d+_s\d+)'/g)].map((m) => m[1]));
const recruitMonsterIds = valuesForKey(recruitsText, 'monsterId');
const monsterIds = idsInFile(monstersText);
const heroIds = idsInFile(heroesText);
const bossIds = idsInFile(bossesText);
const stratumIds = idsInFile(strataText);
const buildIds = topLevelArrayIds(buildsText);
const relicIds = idsInFile(relicsText);
const synergyIds = idsInFile(synergiesText);

const errors = [];
const checkAll = (label, refs, known, hint = '') => {
  const knownSet = new Set(known);
  for (const ref of uniq(refs)) {
    if (!knownSet.has(ref)) errors.push(`${label}: unknown "${ref}"${hint}`);
  }
};

checkAll('stage.heroPool', arraysForKey(stagesText, 'heroPool'), heroIds, ' in HEROES');
checkAll('stage.bossId', valuesForKey(stagesText, 'bossId'), bossIds, ' in BOSSES');
checkAll('stage.stratumId', valuesForKey(stagesText, 'stratumId'), stratumIds, ' in STRATA');
checkAll('stage.unlockCondition.clearedStageId', valuesForKey(stagesText, 'clearedStageId'), stageIds, ' in STAGES');
checkAll('stage.firstClearReward.unlockRecruitIds', arraysForKey(stagesText, 'unlockRecruitIds'), recruitMonsterIds, ' in RECRUITS');
checkAll('stage.firstClearReward.unlockRecruitIds', arraysForKey(stagesText, 'unlockRecruitIds'), monsterIds, ' in MONSTERS');
checkAll('stage.repeatReward.heroFragments', objectKeysForKey(stagesText, 'heroFragments'), [...heroIds, ...bossIds], ' in HEROES or BOSSES');
for (const stage of stageBossConfigs(stagesText)) {
  if (stage.waveLimit % 5 !== 0) {
    errors.push(`stage.waveLimit: ${stage.id} has bossId "${stage.bossId}" but waveLimit ${stage.waveLimit} is not a boss wave`);
  }
}

checkAll('recruit.monsterId', recruitMonsterIds, monsterIds, ' in MONSTERS');
checkAll('recruit.unlockStageId', valuesForKey(recruitsText, 'unlockStageId'), stageIds, ' in STAGES');
checkAll('recruit.recommendedForBuilds', arraysForKey(recruitsText, 'recommendedForBuilds'), buildIds, ' in BUILDS');

checkAll('monster.evolveTo', valuesForKey(monstersText, 'evolveTo'), monsterIds, ' in MONSTERS');
checkAll('build.goal.relicAny', arraysForKey(buildsText, 'relicAny'), relicIds, ' in RELICS');
checkAll('build.goal.synergyActiveProcs.id', synergyGoalIds(buildsText), synergyIds, ' in SYNERGIES');

if (errors.length > 0) {
  console.error(`Game data validation failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  counts: {
    stages: stageIds.length,
    recruits: recruitMonsterIds.length,
    monsters: monsterIds.length,
    heroes: heroIds.length,
    bosses: bossIds.length,
    strata: stratumIds.length,
    builds: buildIds.length,
    relics: relicIds.length,
    synergies: synergyIds.length,
  },
}, null, 2));
