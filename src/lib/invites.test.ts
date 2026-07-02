import { describe, expect, it } from 'vitest'
import { buildInviteLink, parseInviteCode } from './invites'

describe('buildInviteLink', () => {
  const cases: { name: string; code: string; origin: string; want: string }[] = [
    {
      name: 'plain code',
      code: 'ABCD2345',
      origin: 'https://baby.example.com',
      want: 'https://baby.example.com/settings?invite=ABCD2345',
    },
    {
      name: 'origin without trailing slash is used verbatim',
      code: 'WXYZ6789',
      origin: 'http://localhost:5173',
      want: 'http://localhost:5173/settings?invite=WXYZ6789',
    },
    {
      name: 'code is url-encoded',
      code: 'A B',
      origin: 'https://x.test',
      want: 'https://x.test/settings?invite=A%20B',
    },
  ]

  it.each(cases)('$name', ({ code, origin, want }) => {
    expect(buildInviteLink(code, origin)).toBe(want)
  })
})

describe('parseInviteCode', () => {
  const cases: { name: string; search: string; want: string | null }[] = [
    { name: 'present', search: '?invite=ABCD2345', want: 'ABCD2345' },
    { name: 'lower-cased is normalised to upper', search: '?invite=abcd2345', want: 'ABCD2345' },
    { name: 'trimmed', search: '?invite=%20ABCD2345%20', want: 'ABCD2345' },
    { name: 'alongside other params', search: '?foo=1&invite=WXYZ6789', want: 'WXYZ6789' },
    { name: 'absent', search: '?foo=1', want: null },
    { name: 'empty string', search: '', want: null },
    { name: 'blank value', search: '?invite=', want: null },
    { name: 'whitespace-only value', search: '?invite=%20%20', want: null },
  ]

  it.each(cases)('$name', ({ search, want }) => {
    expect(parseInviteCode(search)).toBe(want)
  })
})
