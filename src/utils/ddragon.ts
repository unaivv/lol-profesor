// DDragon utilities - manages champion/item/spell image URLs
// Fetches champion.json on app start to get correct filenames

import { useState, useEffect } from 'react'

const DD_VERSION = '16.8.1'
const BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`

let championMap: Record<number, string> = {}       // id -> ddragonKey (for images)
let championNameMap: Record<number, string> = {}   // id -> display name
let loaded = false
const loadListeners: Array<() => void> = []

interface ChampionInfo {
  key: string
  id: string
  name: string
}

export function initChampionMap(): void {
  if (loaded) return

  fetch(`${BASE_URL}/data/en_US/champion.json`)
    .then(res => res.json())
    .then((data: { data: Record<string, ChampionInfo> }) => {
      for (const champ of Object.values(data.data)) {
        const id = parseInt(champ.key, 10)
        if (!isNaN(id)) {
          championMap[id] = champ.id
          championNameMap[id] = champ.name
        }
      }
      loaded = true
      loadListeners.forEach(fn => fn())
      loadListeners.length = 0
    })
    .catch(e => console.error('Failed to load champion map:', e))
}

export function useChampionMap(): boolean {
  const [ready, setReady] = useState(loaded)
  useEffect(() => {
    if (loaded) { setReady(true); return }
    const cb = () => setReady(true)
    loadListeners.push(cb)
    return () => { const i = loadListeners.indexOf(cb); if (i >= 0) loadListeners.splice(i, 1) }
  }, [])
  return ready
}

export function getChampionName(championId: number): string {
  return championNameMap[championId] || `Champion ${championId}`
}

// Champion image from ID
export function getChampionImageUrl(championId: number): string {
  const name = championMap[championId]
  if (name) {
    return `${BASE_URL}/img/champion/${name}.png`
  }
  return `${BASE_URL}/img/champion/Aatrox.png`
}

// Champion image from name (for when you already have the name)
// Uses championMap to normalize the name to the correct DDragon format
export function getChampionImageUrlByName(championName: string): string {
  // First try to find by matching the name in our championMap (normalize)
  const normalizedName = Object.values(championMap).find(
    (name) => name.toLowerCase() === championName.toLowerCase()
  )
  if (normalizedName) {
    return `${BASE_URL}/img/champion/${normalizedName}.png`
  }
  
  // If we have the championMap loaded, try to find by ID if the name is a number
  const id = parseInt(championName, 10)
  if (!isNaN(id) && championMap[id]) {
    return `${BASE_URL}/img/champion/${championMap[id]}.png`
  }
  
  // Last resort: try the name as-is (may work for some cases)
  return `${BASE_URL}/img/champion/${championName}.png`
}

// Profile icon
export function getProfileIconUrl(iconId: number): string {
  return `${BASE_URL}/img/profileicon/${iconId}.png`
}

// Item image
export function getItemImageUrl(itemId: number): string {
  return `${BASE_URL}/img/item/${itemId}.png`
}

// Spell image
export function getSpellImageUrl(spellName: string): string {
  return `${BASE_URL}/img/spell/${spellName}.png`
}

// Rune images
let runeMap: Record<number, string> = {}
let runesLoaded = false

export function initRuneMap(): void {
  if (runesLoaded) return
  fetch(`${BASE_URL}/data/en_US/runesReforged.json`)
    .then(res => res.json())
    .then((styles: Array<{ id: number; icon: string; slots: Array<{ runes: Array<{ id: number; icon: string }> }> }>) => {
      for (const style of styles) {
        runeMap[style.id] = style.icon
        for (const slot of style.slots) {
          for (const rune of slot.runes) {
            runeMap[rune.id] = rune.icon
          }
        }
      }
      runesLoaded = true
    })
    .catch(() => {})
}

export function getRuneImageUrl(runeId: number): string {
  const path = runeMap[runeId]
  if (path) return `https://ddragon.leagueoflegends.com/cdn/img/${path}`
  return ''
}