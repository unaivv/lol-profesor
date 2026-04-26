export interface MyProfile {
  region: string
  gameName: string
  tagLine: string
  profileIconId?: number
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

  const updateProfileIcon = (iconId: number) => {
    const current = getMyProfile()
    if (current) {
      setMyProfile({ ...current, profileIconId: iconId })
    }
  }

  const clearMyProfile = () => {
    localStorage.removeItem(KEY)
    localStorage.removeItem('lolProfessorMyProfileData')
  }

  return { getMyProfile, setMyProfile, updateProfileIcon, clearMyProfile }
}
