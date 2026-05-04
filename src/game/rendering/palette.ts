/**
 * 마스터 32색 팔레트 (PIXEL_ART_DIRECTOR §마스터 팔레트)
 * 이 외의 색상 사용 금지.
 */
export const MASTER_PAL = {
  outline: '#1A1A2E',

  // 마왕 진영 (보라/핑크)
  purpleDarkest: '#2D1B4E',
  purpleDeep: '#4A2068',
  purpleMain: '#7B2D8E',
  purpleLight: '#9B59B6',
  purplePale: '#D5A6E6',
  pinkAccent: '#FD79A8',

  // 용사 진영 (파랑/금)
  navyDark: '#1B3A5C',
  blueRoyal: '#0984E3',
  blueSky: '#3498DB',
  blueLight: '#74B9FF',
  silver: '#DFE6E9',
  gold: '#FDCB6E',

  // 자연 (초록)
  forestDark: '#0B3D2E',
  teal: '#1ABC9C',
  emerald: '#2ECC71',
  greenLight: '#A3D9A5',

  // 불/위험
  crimsonDark: '#6B1A1A',
  crimson: '#D63031',
  red: '#E74C3C',
  orange: '#E17055',
  salmon: '#FF6B6B',

  // 뼈/언데드
  slate: '#2C3E50',
  gray: '#636E72',
  grayLight: '#95A5A6',
  silverLight: '#BDC3C7',
  offWhite: '#ECF0F1',

  // 빛/특수
  goldPure: '#F1C40F',
  yellow: '#FFEAA7',
  goldBright: '#FFD700',
  white: '#FFFFFF',
  // OVERHAUL §4.1: 카이로 감성 — 따뜻한 호박색 + 크림
  amber: '#F5A623',
  amberDark: '#C97A1A',
  cream: '#F5E6C8',

  // 배경 전용
  bgDeepest: '#0D0D1A',
  bgNight: '#0F0F2A',
  bgPurpleNight: '#1A0A2E',
} as const;

export type PaletteColor = typeof MASTER_PAL[keyof typeof MASTER_PAL];
