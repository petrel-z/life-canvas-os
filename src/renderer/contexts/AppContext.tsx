import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { AppState, DimensionType } from '~/shared/types'
import { INITIAL_STATE } from '~/renderer/lib/constants'
import { useUserApi } from '~/renderer/hooks/useUserApi'
import { getCache, setCache, CACHE_KEYS } from '~/renderer/lib/cacheUtils'

interface AppContextType {
  state: AppState
  updateState: (updates: Partial<AppState>) => void
  updateDimension: (type: DimensionType, score: number) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  lock: () => void
  unlock: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const { getUserProfile } = useUserApi()
  const isLoadingRef = useRef(false)
  const getUserProfileRef = useRef(getUserProfile)

  useEffect(() => {
    getUserProfileRef.current = getUserProfile
  }, [getUserProfile])

  // 从 localStorage 加载初始状态
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = getCache<AppState>(CACHE_KEYS.LIFE_CANVAS_STATE)
      if (saved) {
        const { isLocked, ...restSaved } = saved
        return { ...INITIAL_STATE, ...restSaved }
      }
    } catch (_error) {
    }
    return INITIAL_STATE
  })

  // 加载用户信息
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true

      try {
        const profile = await getUserProfileRef.current()
        if (profile) {
          setState(prev => ({
            ...prev,
            user: {
              name: profile.name || '',
              birthday: profile.birthday || '',
              mbti: profile.mbti || '',
              values: profile.values || [],
              lifespan: profile.lifespan || 0,
            },
          }))
        }
      } catch (_error) {
        console.log('User profile not set yet1')
      } finally {
        isLoadingRef.current = false
      }
    }

    loadUserProfile()
  }, [])

  // 主题切换逻辑（带动画）
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.add('theme-transitioning')

    const isDark =
      state.theme === 'dark' ||
      (state.theme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 300) // 与 CSS 过渡时间匹配

    return () => clearTimeout(timeout)
  }, [state.theme])

  useEffect(() => {
    try {
      const { isLocked, ...stateWithoutLock } = state
      setCache(CACHE_KEYS.LIFE_CANVAS_STATE, stateWithoutLock)
    } catch (_error) {
    }
  }, [state])

  // 更新状态
  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // 更新单个维度评分
  const updateDimension = (type: DimensionType, score: number) => {
    const clampedScore = Math.max(0, Math.min(100, score))
    setState(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [type]: clampedScore,
      },
    }))
  }

  // 设置主题
  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    updateState({ theme })
  }

  // 锁定应用
  const lock = () => {
    updateState({ isLocked: true })
  }

  // 解锁应用
  const unlock = () => {
    updateState({ isLocked: false })
  }

  const value: AppContextType = {
    state,
    updateState,
    updateDimension,
    setTheme,
    lock,
    unlock,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
