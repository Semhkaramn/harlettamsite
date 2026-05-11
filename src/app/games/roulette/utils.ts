// Roulette game utility functions

import type { BetType } from './types'

// Çark üzerindeki sayı sırası (Avrupa ruleti)
export const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

// Kırmızı sayılar
export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

// Sütun sayıları
export const COLUMN1_NUMBERS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
export const COLUMN2_NUMBERS = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
export const COLUMN3_NUMBERS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]

// Bahis chip değerleri
export const CHIP_VALUES = [10, 25, 50, 100, 250, 500]

// Sayının rengini al
export function getNumberColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green'
  if (RED_NUMBERS.includes(num)) return 'red'
  return 'black'
}

// Çark üzerindeki sayının açısını hesapla
export function getWheelAngle(num: number): number {
  const index = WHEEL_NUMBERS.indexOf(num)
  if (index === -1) return 0
  // 360 derece / 37 sayı = ~9.73 derece per slot
  const degreesPerSlot = 360 / WHEEL_NUMBERS.length
  return index * degreesPerSlot
}

// Sayıyı formatla (binlik ayraç)
export function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR')
}

// Bahis tipinin Türkçe etiketini al
export function getBetTypeLabel(betType: BetType, value?: number): string {
  switch (betType) {
    case 'number':
      return value !== undefined ? `Sayı ${value}` : 'Sayı'
    case 'red':
      return 'Kırmızı'
    case 'black':
      return 'Siyah'
    case 'odd':
      return 'Tek'
    case 'even':
      return 'Çift'
    case 'low':
      return '1-18'
    case 'high':
      return '19-36'
    case 'first12':
      return '1-12'
    case 'second12':
      return '13-24'
    case 'third12':
      return '25-36'
    case 'column1':
      return '1. Sütun'
    case 'column2':
      return '2. Sütun'
    case 'column3':
      return '3. Sütun'
    default:
      return betType
  }
}

// Bahsin kazanıp kazanmadığını kontrol et (client-side için)
export function isBetWinner(betType: BetType, betValue: number | undefined, result: number): boolean {
  switch (betType) {
    case 'number':
      return betValue === result
    case 'red':
      return RED_NUMBERS.includes(result)
    case 'black':
      return result > 0 && !RED_NUMBERS.includes(result)
    case 'odd':
      return result > 0 && result % 2 === 1
    case 'even':
      return result > 0 && result % 2 === 0
    case 'low':
      return result >= 1 && result <= 18
    case 'high':
      return result >= 19 && result <= 36
    case 'first12':
      return result >= 1 && result <= 12
    case 'second12':
      return result >= 13 && result <= 24
    case 'third12':
      return result >= 25 && result <= 36
    case 'column1':
      return COLUMN1_NUMBERS.includes(result)
    case 'column2':
      return COLUMN2_NUMBERS.includes(result)
    case 'column3':
      return COLUMN3_NUMBERS.includes(result)
    default:
      return false
  }
}

// Renk hex kodlarını al
export function getColorHex(color: 'red' | 'black' | 'green'): string {
  switch (color) {
    case 'red':
      return '#DC2626'
    case 'black':
      return '#1F2937'
    case 'green':
      return '#059669'
    default:
      return '#1F2937'
  }
}
