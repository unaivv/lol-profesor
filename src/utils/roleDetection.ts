// Summoner spell IDs
const SMITE   = 11
const EXHAUST = 3
const HEAL    = 7
const TELEPORT = 12

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

interface PlayerSpells {
  puuid?: string
  spell1Id: number
  spell2Id: number
}

function hasSpell(p: PlayerSpells, id: number): boolean {
  return p.spell1Id === id || p.spell2Id === id
}

// Assigns roles to a 5-player team using summoner spells.
// Accuracy: ~85-90% for solo/duo queue.
export function detectTeamRoles(team: PlayerSpells[]): Map<string, Role> {
  const roles = new Map<string, Role>()

  const key = (p: PlayerSpells) => p.puuid ?? ''
  const unassigned = () => team.filter(p => !roles.has(key(p)))

  // 1. Smite → jungle (near 100%)
  for (const p of unassigned()) {
    if (hasSpell(p, SMITE)) roles.set(key(p), 'jungle')
  }

  // 2. Exhaust → support (high accuracy in Solo/Duo)
  for (const p of unassigned()) {
    if (hasSpell(p, EXHAUST)) roles.set(key(p), 'support')
  }

  // 3. Heal → adc (very common on bot carry)
  for (const p of unassigned()) {
    if (hasSpell(p, HEAL)) roles.set(key(p), 'adc')
  }

  // 4. Teleport — first TP user = top, second = mid (two-TP games happen)
  const tpUsers = unassigned().filter(p => hasSpell(p, TELEPORT))
  if (tpUsers.length >= 1) roles.set(key(tpUsers[0]), 'top')
  if (tpUsers.length >= 2) roles.set(key(tpUsers[1]), 'mid')

  // 5. Any remaining player defaults to mid
  for (const p of unassigned()) {
    roles.set(key(p), 'mid')
  }

  return roles
}

interface Participant extends PlayerSpells {
  teamId: number
}

export function findLaneOpponent(
  myPuuid: string,
  participants: Participant[],
): { myRole: Role; opponentPuuid: string | null } {
  const me = participants.find(p => p.puuid === myPuuid)
  if (!me) return { myRole: 'mid', opponentPuuid: null }

  const myTeam    = participants.filter(p => p.teamId === me.teamId)
  const enemyTeam = participants.filter(p => p.teamId !== me.teamId)

  const myTeamRoles    = detectTeamRoles(myTeam)
  const enemyTeamRoles = detectTeamRoles(enemyTeam)

  const myRole = myTeamRoles.get(myPuuid) ?? 'mid'

  let opponentPuuid: string | null = null
  for (const [puuid, role] of enemyTeamRoles.entries()) {
    if (role === myRole && puuid !== '') { opponentPuuid = puuid; break }
  }

  return { myRole, opponentPuuid }
}
