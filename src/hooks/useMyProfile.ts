export interface MyProfile {
  region: string
  gameName: string
  tagLine: string
}

const KEY = 'lolProfessorMyProfile'

export function useMyProfile() {
  const getMyProfile = (): MyProfile | null => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const setMyProfile = (profile: MyProfile) => {
    localStorage.setItem(KEY, JSON.stringify(profile))
  }

  const clearMyProfile = () => {
    localStorage.removeItem(KEY)
  }

  return { getMyProfile, setMyProfile, clearMyProfile }
}
