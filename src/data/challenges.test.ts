import { describe, expect, it } from 'vitest'
import { challenges, getChallenge, getChallengeDate, getCurrentChallenge } from './challenges'
import { routes } from '../router'

describe('challenge calendar', () => {
  it('contains one prompt for every day in November', () => {
    expect(challenges).toHaveLength(30)
    expect(challenges.map(({ day }) => day)).toEqual(
      Array.from({ length: 30 }, (_, index) => String(index + 1).padStart(2, '0')),
    )
  })

  it('preserves the empty prompt description and resolves challenge dates', () => {
    expect(getChallenge('18')).toEqual({ day: '18', name: 'NULL', description: '' })
    expect(getChallengeDate('01')).toBe('01 November 2026')
    expect(getChallenge('31')).toBeUndefined()
  })

  it('creates a dedicated route for each prompt', () => {
    expect(routes.filter(({ name }) => String(name).startsWith('challenge-'))).toHaveLength(30)
  })

  it('returns the current prompt only during the challenge period', () => {
    expect(getCurrentChallenge(new Date(2026, 9, 31))).toBeUndefined()
    expect(getCurrentChallenge(new Date(2026, 10, 6))?.day).toBe('06')
    expect(getCurrentChallenge(new Date(2026, 11, 1))).toBeUndefined()
  })
})
